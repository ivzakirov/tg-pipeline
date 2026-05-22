# tg-pipeline

Real-time Telegram message monitoring with multi-user support, flexible filter pipelines, and a Telegram-like web viewer.

## Overview

Each user connects their own Telegram account (via MTProto userbot). They define **pipelines** — named combinations of source channels/groups and a filter tree (keywords, regex, sender blocks, media type). Matching messages appear in a live feed; history is paginated from PostgreSQL.

```
Telegram ──GramJS──► telegram-collector ──► kafka: telegram.raw
                                                      │
                                              filter-engine
                                         ┌────────────┴────────────┐
                               pipeline.filtered             telegram.raw.dlt
                                         │
                               realtime-gateway (WebSocket)
                                         │
                                      Browser
```

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 10, TypeScript |
| Message broker | Apache Kafka 3.7 (KRaft) |
| Database | PostgreSQL 16 |
| Cache / auth state | Redis 7 |
| Telegram | GramJS (MTProto userbot) |
| Frontend | React + Rspack Module Federation |
| Gateway | nginx (API gateway + static files) |
| Container | Docker Compose |

## Services

| Service | Port (internal) | Role |
|---|---|---|
| `config-api` | 3001 | REST API — auth, sources, pipelines, messages |
| `telegram-collector` | 3003 | GramJS userbot pool, publishes to Kafka |
| `filter-engine` | 3004 | Consumes `telegram.raw`, evaluates filter trees |
| `realtime-gateway` | 3002 | WebSocket gateway, fan-out to subscribers |
| `frontend-shell` | 80 | React host MFE (layout, routing, auth) |
| `frontend-viewer` | 80 | Message feed remote MFE |
| `frontend-pipeline` | 80 | Visual pipeline editor remote MFE (React Flow) |
| `nginx` | **80** | Single entry point — routes `/api/`, `/ws/`, MFE remotes |

## Quick Start

**Prerequisites:** Docker, Docker Compose v2.

```bash
git clone <repo>
cd tg-pipeline

# Copy and fill in secrets (see Configuration below)
cp apps/config-api/.env.example apps/config-api/.env
cp apps/telegram-collector/.env.example apps/telegram-collector/.env

# Build and start everything
docker compose up --build -d

# Open the app
open http://localhost
```

On first run `init-kafka` creates all topics; `config-api` runs TypeORM `synchronize: true` to create tables.

## Configuration

### Root `.env` (Docker Compose variables)

```env
APP_PORT=80                      # host port nginx binds to
POSTGRES_PASSWORD=<secret>
REDIS_PASSWORD=<secret>
```

### `apps/config-api/.env`

```env
DATABASE_URL=postgres://tg_pipeline:<POSTGRES_PASSWORD>@postgres:5432/tg_pipeline
REDIS_URL=redis://:<REDIS_PASSWORD>@redis:6379
KAFKA_BROKERS=kafka:9092

JWT_SECRET=<random 32+ chars>
JWT_REFRESH_SECRET=<random 32+ chars>
SESSION_ENCRYPTION_KEY=<64 hex chars — openssl rand -hex 32>

# From https://my.telegram.org → App configuration
TELEGRAM_API_ID=<id>
TELEGRAM_API_HASH=<hash>

PORT=3001
LOG_LEVEL=info
```

### `apps/telegram-collector/.env`

```env
DATABASE_URL=postgres://tg_pipeline:<POSTGRES_PASSWORD>@postgres:5432/tg_pipeline
KAFKA_BROKERS=kafka:9092
SESSION_ENCRYPTION_KEY=<same key as config-api>
TELEGRAM_API_ID=<id>
TELEGRAM_API_HASH=<hash>
PORT=3003
LOG_LEVEL=info
```

### `apps/filter-engine/.env` and `apps/realtime-gateway/.env`

```env
DATABASE_URL=postgres://tg_pipeline:<POSTGRES_PASSWORD>@postgres:5432/tg_pipeline
KAFKA_BROKERS=kafka:9092
JWT_SECRET=<same as config-api>
PORT=3004   # or 3002 for gateway
LOG_LEVEL=info
```

## REST API

All endpoints (except `/auth/*`) require `Authorization: Bearer <access_token>`.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account `{ email, password }` |
| `POST` | `/api/auth/login` | Login, returns `accessToken` + `refresh_token` cookie |
| `POST` | `/api/auth/refresh` | Rotate tokens using `refresh_token` cookie |

### Telegram Account

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/telegram-auth/status` | Check if account is connected |
| `POST` | `/api/telegram-auth/send-code` | Start phone auth `{ phone }` |
| `POST` | `/api/telegram-auth/verify-code` | Submit SMS code `{ phone, code, phoneCodeHash }` |
| `POST` | `/api/telegram-auth/verify-2fa` | Submit 2FA password `{ password }` |
| `DELETE` | `/api/telegram-auth` | Disconnect Telegram account |

### Sources, Pipelines, Messages

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/api/sources` | List / create Telegram sources |
| `GET/PATCH/DELETE` | `/api/sources/:id` | Get / update / delete source |
| `GET/POST` | `/api/pipelines` | List / create pipelines |
| `GET/PATCH/DELETE` | `/api/pipelines/:id` | Get / update / delete pipeline |
| `GET` | `/api/messages/:pipelineId` | Message history — supports `?limit=50&before=<ISO date>` |
| `GET` | `/api/avatars/:senderId` | Cached sender avatar (jpeg) |
| `GET` | `/api/media/:channelId/:messageId` | Cached media (photo/video thumb/audio) |

Interactive docs: `http://localhost/api/docs` (Swagger UI).

## Filter Tree

Pipelines store a JSONB filter tree. The visual editor serialises it automatically.

```ts
interface FilterGroup {
  operator: 'AND' | 'OR' | 'NOT';
  children: (FilterGroup | FilterCondition)[];
}

interface FilterCondition {
  type: 'keyword' | 'regex' | 'sender' | 'has_media' | 'media_type';
  value?: string | string[];
  negate?: boolean;
  label?: string;   // display name shown in editor (e.g. sender's name)
}
```

Example — show only messages containing "crypto" that are not from a specific sender:

```json
{
  "operator": "AND",
  "children": [
    { "type": "keyword", "value": "crypto" },
    { "type": "sender", "value": "123456789", "negate": true, "label": "SpamBot" }
  ]
}
```

## WebSocket

Connect with Socket.io to `ws://localhost/ws/socket.io` with `auth: { token }`.

```js
const socket = io('/', {
  path: '/ws/socket.io',
  auth: { token: accessToken },
  transports: ['websocket'],
});

socket.emit('subscribe', { pipelineId: '<uuid>' });
socket.on('message', (msg) => console.log(msg));
socket.emit('unsubscribe', { pipelineId: '<uuid>' });
```

Messages arrive as `FilteredMessage` objects (see `packages/kafka-schemas/src/messages.ts`).

## Kafka Topics

| Topic | Producer | Consumer | Purpose |
|---|---|---|---|
| `telegram.raw` | telegram-collector | filter-engine | All incoming Telegram messages |
| `telegram.raw.dlt` | filter-engine | — | Dead-letter: processing errors |
| `pipeline.filtered` | filter-engine | realtime-gateway | Messages that passed filters |
| `config.sources.changed` | config-api | telegram-collector | Hot-reload source subscriptions |
| `config.pipelines.changed` | config-api | filter-engine | Hot-reload pipeline filter trees |
| `config.users.telegram.changed` | config-api | telegram-collector | Connect / disconnect userbot |

## Development

```bash
# Install dependencies
pnpm install

# Run a single service with hot-reload (infra must be running in Docker)
pnpm --filter @tg-pipeline/config-api dev
pnpm --filter @tg-pipeline/frontend-viewer dev   # http://localhost:5001

# Typecheck all packages
pnpm turbo typecheck
```

### Local infra only (Kafka + Postgres + Redis)

```bash
docker compose up -d kafka postgres redis init-kafka
```

Then start services locally with `pnpm dev` pointing at `localhost:*` via their `.env` files.

## Project Structure

```
tg-pipeline/
├── apps/
│   ├── config-api/           # NestJS REST API + TypeORM + JWT
│   ├── telegram-collector/   # GramJS userbot pool
│   ├── filter-engine/        # Filter evaluator, Kafka consumer/producer
│   ├── realtime-gateway/     # Socket.io WebSocket server
│   ├── frontend-shell/       # Rspack MF host (layout, auth)
│   ├── frontend-viewer/      # Message feed remote MFE
│   └── frontend-pipeline/    # React Flow pipeline editor remote MFE
├── packages/
│   ├── shared-types/         # TypeScript interfaces shared across services
│   ├── kafka-schemas/        # Topic name constants + message schemas
│   └── logger/               # Structured Pino logger factory
├── infra/
│   └── nginx/nginx.conf      # API gateway routing rules
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Health Checks

Each service exposes `GET /health`.

```bash
curl http://localhost/api/health          # config-api
curl http://localhost:3002/health         # realtime-gateway (direct)
curl http://localhost:3003/health         # telegram-collector (direct)
```

## Database Access

PostgreSQL is exposed on `localhost:5432` for local tooling (DBeaver, TablePlus, psql):

```
Host:     localhost
Port:     5432
Database: tg_pipeline
User:     tg_pipeline
Password: tg_pipeline_dev  (or value of POSTGRES_PASSWORD in .env)
```

Or via Docker:

```bash
docker compose exec postgres psql -U tg_pipeline -d tg_pipeline
```

## Rebuilding After Code Changes

```bash
# Rebuild a single service
docker compose build <service>
docker compose up -d <service>

# Rebuild all and restart
docker compose build && docker compose up -d
```

## Troubleshooting

**No messages after waking from sleep**
GramJS TCP connections break on network resume. The `telegram-collector` has a 90-second watchdog that auto-reconnects. If messages still don't appear after 2 minutes, restart manually:
```bash
docker compose restart telegram-collector
```

**WebSocket keeps reconnecting**
Check that nginx is running and the `/ws/` location block does not rewrite the path (the socket.io path must reach the gateway unchanged).

**Avatar images show initials instead of photo**
Avatars are cached lazily on first message from that sender. The cache warms up over time.
