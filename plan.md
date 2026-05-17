# Telegram Message Pipeline System — Plan

## Context

Система для мониторинга Telegram каналов/групп в реальном времени с гибкой системой
фильтрации сообщений и их маршрутизацией через Apache Kafka. Фронтенд — микрофронтенды
с Telegram-подобным viewer'ом и визуальным редактором пайплайнов.

**Стек:** TypeScript повсюду, NestJS (бэкенд), React (фронтенд), GramJS (Telegram MTProto),
Apache Kafka (KafkaJS), PostgreSQL, Docker Compose.

---

## Архитектура

### Поток данных
```
Telegram ──GramJS──► telegram-collector ──► kafka: telegram.raw
                                                      │
                                              filter-engine (потребляет)
                                             ┌────────┴────────┐
                                   kafka: pipeline.filtered   kafka: telegram.raw.dlt
                                             │                  (Dead Letter Topic)
                                    realtime-gateway
                                    (WebSocket server)
                                             │
                                         Frontend
```

### Микросервисы (NestJS, pnpm monorepo)

| Сервис | Порт | Роль |
|---|---|---|
| `telegram-collector` | internal | GramJS userbot, публикует в `telegram.raw` |
| `filter-engine` | internal | Потребляет `telegram.raw`, применяет пайплайны, роутит в `pipeline.filtered` |
| `config-api` | 3001 | REST CRUD для источников, фильтров, пайплайнов + JWT auth |
| `realtime-gateway` | 3002 | Только WebSocket Gateway + Kafka consumer |

**Nginx** выступает единственной точкой входа и API Gateway:
- `/api/*` → `config-api:3001`
- `/ws` → `realtime-gateway:3002`
- `/` → `frontend-shell` (статика)

### Микрофронтенды (Rspack Module Federation)

| MFE | Порт dev | Роль |
|---|---|---|
| `shell` (host) | 5000 | Layout, роутинг, JWT auth |
| `viewer` (remote) | 5001 | Real-time лента сообщений, Telegram-like UI |
| `pipeline-config` (remote) | 5002 | React Flow редактор пайплайнов |

---

## Структура проекта

```
/
├── apps/
│   ├── telegram-collector/   # NestJS microservice
│   ├── filter-engine/        # NestJS microservice
│   ├── config-api/           # NestJS REST API + TypeORM + JWT
│   ├── realtime-gateway/     # NestJS WebSocket + Kafka consumer
│   ├── frontend-shell/       # React + Rspack host MFE
│   ├── frontend-viewer/      # React + Rspack remote MFE
│   └── frontend-pipeline/    # React + Rspack remote MFE
├── packages/
│   ├── shared-types/         # TS интерфейсы для всех сервисов и MFE
│   ├── kafka-schemas/        # Kafka topic names + message schemas (constants)
│   └── logger/               # Shared Pino logger factory (structured JSON logs)
├── infra/
│   ├── nginx/nginx.conf
│   └── postgres/migrations/  # TypeORM миграции (не raw SQL)
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Kafka Topics

```
telegram.raw                    # Все входящие сообщения (включает userId в payload)
telegram.raw.dlt                # Dead Letter Topic — необработанные filter-engine
config.sources.changed          # Изменения источников (telegram-collector перечитывает)
config.pipelines.changed        # Изменения пайплайнов (filter-engine hot-reload)
config.users.telegram.changed   # Подключение/отключение Telegram-аккаунта пользователя
pipeline.filtered               # Все отфильтрованные сообщения (pipelineId, userId в payload)
```

> **Почему один `pipeline.filtered`:** один топик вместо `pipeline.{id}` на каждый пайплайн.
> Kafka не рассчитан на сотни динамических топиков — каждый топик создаёт файлы на диске
> и overhead в KRaft. realtime-gateway фильтрует нужный `pipelineId` на стороне потребителя.

---

## Модель данных (PostgreSQL)

Полная изоляция данных по пользователям: каждая сущность имеет `owner_id`.
config-api фильтрует **все** запросы по `owner_id` из JWT-клейма — пользователь
физически не может получить чужие данные.

```sql
-- Пользователи
users (
  id UUID PK, email TEXT UNIQUE, password_hash TEXT,
  created_at TIMESTAMPTZ
)

-- Источники (per-user)
sources (
  id UUID PK, owner_id UUID FK → users,
  name TEXT, telegram_id BIGINT,
  telegram_username TEXT, type channel|group, enabled BOOL,
  UNIQUE (owner_id, telegram_id)   -- один канал не дублируется у одного юзера
)

-- Пайплайны (per-user)
pipelines (
  id UUID PK, owner_id UUID FK → users,
  name TEXT, enabled BOOL,
  filter_config JSONB              -- дерево FilterGroup
)

-- Связь пайплайн ↔ источники
pipeline_sources (
  pipeline_id UUID FK → pipelines,
  source_id UUID FK → sources
  -- оба должны принадлежать одному owner_id (проверяется на уровне сервиса)
)

-- История сообщений (per-user через pipeline)
messages (
  id UUID PK, pipeline_id UUID FK → pipelines,
  telegram_message_id BIGINT, channel_id BIGINT,
  sender_id BIGINT, sender_name TEXT,
  text TEXT, media_type TEXT, media_url TEXT,
  received_at TIMESTAMPTZ,
  INDEX (pipeline_id, received_at DESC)
)

-- GramJS сессии (по одной на пользователя, зашифрованы)
telegram_sessions (
  id UUID PK,
  user_id UUID FK → users UNIQUE,  -- один Telegram-аккаунт на пользователя
  session_string_encrypted TEXT,   -- AES-256-GCM, ключ из env SESSION_ENCRYPTION_KEY
  phone TEXT,
  created_at TIMESTAMPTZ, last_used_at TIMESTAMPTZ
)
```

> **Изолированные userbot-ы:** каждый пользователь подключает свой Telegram-аккаунт.
> `telegram-collector` управляет `Map<userId, TelegramClient>` — один процесс, несколько клиентов.
> Каждый клиент подписан только на каналы своего владельца и публикует сообщения с `userId` в payload.

### Схема фильтра (JSONB в `pipelines.filter_config`)

```typescript
// packages/shared-types/src/filter.ts
export interface FilterGroup {
  operator: 'AND' | 'OR' | 'NOT';
  children: (FilterGroup | FilterCondition)[];
}

export interface FilterCondition {
  type: 'keyword' | 'regex' | 'sender' | 'has_media' | 'media_type';
  value?: string | string[];
  negate?: boolean;
}
```

### Схема Kafka-сообщений

```typescript
// packages/kafka-schemas/src/index.ts
export interface RawTelegramMessage {
  messageId: number;
  channelId: number;
  senderId: number;
  senderName: string;
  text: string;
  mediaType?: string;
  mediaUrl?: string;
  timestamp: string; // ISO 8601
}

export interface FilteredMessage extends RawTelegramMessage {
  pipelineId: string;
  pipelineName: string;
}
```

---

## Детали реализации по сервисам

### telegram-collector
- Управляет `Map<userId, TelegramClient>` — один сервис, несколько изолированных GramJS-клиентов
- При старте — читает все активные сессии из `telegram_sessions` в PostgreSQL, для каждой создаёт и подключает `TelegramClient`
- Каждый `TelegramClient` подписывается только на каналы своего `userId` (из таблицы `sources`)
- При получении `config.sources.changed` / `config.users.telegram.changed` — обновляет подписки нужного клиента
- Публикует в `telegram.raw`: `{ userId, messageId, channelId, ... }` — `userId` обязателен для filter-engine
- Обработка `FloodWaitError`: exponential backoff per-client, не роняет других клиентов
- Health check: `/health` — количество активных клиентов, статус каждого

### filter-engine
- При старте — загружает пайплайны **напрямую из PostgreSQL**
- При получении `config.pipelines.changed` — hot-reload конкретного пайплайна без рестарта
- Индекс пайплайнов по `(userId, channelId)` (`Map<userId, Map<channelId, Pipeline[]>>`) — O(1) поиск
- Из `telegram.raw` берёт `userId` → находит только пайплайны этого пользователя → нет пересечений между юзерами
- `FilterEvaluator` — рекурсивный обход `FilterGroup` дерева
- При успехе → публикует в `pipeline.filtered` с `{ pipelineId, userId, ... }` в payload
- При исключении → публикует в `telegram.raw.dlt` с `error` и оригинальным сообщением
- Параллельно сохраняет прошедшие фильтр сообщения в таблицу `messages` (для истории)

### config-api
- NestJS + TypeORM + PostgreSQL + Redis (для Telegram auth state)
- REST:
  - `/auth/register`, `/auth/login`, `/auth/refresh`
  - `/telegram-auth/send-code` — инициирует phone auth, state (phoneCodeHash) в Redis (TTL 5 мин)
  - `/telegram-auth/verify-code` — верифицирует код, при успехе шифрует и сохраняет сессию в `telegram_sessions`, публикует `config.users.telegram.changed`
  - `/telegram-auth/verify-2fa` — обрабатывает 2FA-пароль если включён
  - `/telegram-auth/status` — подключён ли аккаунт у текущего пользователя
  - `/sources`, `/pipelines`, `/pipeline-sources`, `/messages`
- **Все endpoints** применяют `JwtAuthGuard` + фильтруют по `req.user.id`
- JWT: access token (15 мин) + refresh token (7 дней, httpOnly cookie)
- TypeORM migrations в `infra/postgres/migrations/`
- При изменении сущностей — публикует в Kafka `config.*.changed` с `userId` в payload
- Swagger, Health check `/health`

### realtime-gateway
- **Только WebSocket** — не проксирует REST (это делает Nginx)
- NestJS WebSocket Gateway с Socket.io
- Kafka consumer для топика `pipeline.filtered`
- JWT-валидация при WebSocket handshake: извлекает `userId` из токена
- Клиент подписывается: `socket.emit('subscribe', { pipelineId })`
- **Перед подпиской** — запрос к config-api (или напрямую в PostgreSQL) для проверки что `pipeline.owner_id === userId` — нельзя подписаться на чужой пайплайн
- При получении сообщения из Kafka — рассылает только авторизованным подписчикам
- При первом подключении — клиент запрашивает историю через REST `/api/messages?pipelineId=...`
- Health check: `/health` — статус Kafka consumer

---

## Микрофронтенды

### Rspack Module Federation (`@module-federation/enhanced`)

Rspack — Rust-based webpack-совместимый бандлер, полная поддержка Module Federation 2.0,
в 5-10× быстрее webpack. Используем вместо `@originjs/vite-plugin-federation` (незрелый).

**shell (host):**
- Загружает remotes по URL из env (`VIEWER_URL`, `PIPELINE_URL`)
- React Router: `/login` → auth, `/` → viewer, `/pipelines` → pipeline-config
- JWT auth: access token в memory (не localStorage — защита от XSS), refresh token в httpOnly cookie
- Axios interceptor для автоматического обновления токена при 401
- Protected routes — неавторизованный пользователь редиректится на `/login`
- Shared: `react`, `react-dom`, `react-router-dom`

**viewer (remote):**
- При маунте — GET `/api/messages?pipelineId=X&limit=50` (история)
- Socket.io-client подключается к `/ws` с JWT в `auth` параметре
- Список пайплайнов в сайдбаре, клик → subscribe к WebSocket
- Лента сообщений: аватар, имя канала, текст, время, тип медиа
- Виртуальный скролл (`@tanstack/react-virtual`) для больших лент

**pipeline-config (remote):**
- React Flow (`@xyflow/react`) — визуальный редактор
- Типы нод: `SourceNode`, `KeywordFilterNode`, `RegexFilterNode`, `SenderFilterNode`, `LogicNode` (AND/OR/NOT), `OutputNode`
- При сохранении: сериализует граф в `FilterGroup` JSON → POST/PUT `/api/pipelines`
- Панель свойств справа при выборе ноды

---

## Observability

Встроено с первого дня, не добавляется потом:

- **Pino** — structured JSON логи во всех сервисах (через `packages/logger`)
- **OpenTelemetry** (`@opentelemetry/sdk-node`) — distributed tracing, trace_id сквозь все сервисы
- **`@nestjs/terminus`** — health checks на каждом сервисе, Docker `healthcheck` в compose

---

## Docker Compose

```yaml
services:
  kafka:             # bitnami/kafka:3.7 (KRaft, без Zookeeper)
  postgres:          # postgres:16-alpine
  redis:             # redis:7-alpine — Telegram auth state (TTL), refresh token blacklist
  nginx:             # nginx:alpine — API Gateway + статика MFE
  telegram-collector:
    depends_on:
      postgres: { condition: service_healthy }
      kafka:    { condition: service_healthy }
  filter-engine:
    depends_on: [postgres, kafka]
  config-api:
    depends_on: [postgres, kafka, redis]
  realtime-gateway:
    depends_on: [kafka]
  frontend-shell:    # nginx serve собранной статики
  frontend-viewer:
  frontend-pipeline:
```

---

## Порядок реализации

1. **Монорепо** — `pnpm-workspace.yaml`, `turbo.json`, общие `tsconfig`, `eslint`
2. **Shared packages** — `shared-types`, `kafka-schemas`, `logger` (Pino factory)
3. **Инфраструктура** — `docker-compose.yml` (Kafka KRaft, PostgreSQL с healthcheck, Nginx)
4. **config-api** — TypeORM сущности, миграции, REST endpoints, JWT auth
5. **telegram-collector** — GramJS + сессия в DB, FloodWait handling, публикация в Kafka
6. **filter-engine** — `FilterEvaluator`, индекс по sourceId, DLT, сохранение в `messages`
7. **realtime-gateway** — WebSocket Gateway, JWT middleware, Kafka consumer, fan-out по subscriptions
8. **frontend-viewer** — история + real-time лента, Socket.io, виртуальный скролл
9. **frontend-pipeline** — React Flow редактор, сериализация в FilterGroup
10. **frontend-shell** — Rspack MF host, роутинг, JWT interceptor
11. **Nginx конфиг** — `/api`, `/ws`, MFE статика
12. **OpenTelemetry** — подключить во все NestJS сервисы

---

## Верификация

- `docker-compose up` — все сервисы проходят healthcheck
- `GET /health` на каждом сервисе возвращает `{ status: "ok" }`
- Зарегистрировать двух пользователей, каждый подключает свой Telegram-аккаунт через `/api/telegram-auth/send-code` → `verify-code`
- `telegram-collector` поднимает второй `TelegramClient` после события `config.users.telegram.changed`
- Каждый пользователь создаёт свои источники и пайплайны — убедиться что пользователь А не видит данные пользователя Б
- В viewer обоих пользователей сообщения приходят независимо — нет пересечений
- Попытаться через WebSocket подписаться на чужой `pipelineId` — получить ошибку авторизации
- `FloodWaitError` у одного клиента не останавливает сбор сообщений у другого
- Добавить Telegram канал через pipeline-config, создать пайплайн с keyword-фильтром
- filter-engine hot-reload при изменении пайплайна (без рестарта контейнера)
- В viewer в реальном времени появляются сообщения из канала
- Сообщения, не прошедшие фильтр — не отображаются, попадают в `telegram.raw.dlt` только при ошибке обработки
- Открыть viewer в новой вкладке — история загружается из PostgreSQL, затем подхватывается WebSocket
- Проверить structured JSON логи: trace_id одинаковый от Telegram-события до WebSocket push
