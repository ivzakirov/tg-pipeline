FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/kafka-schemas/package.json ./packages/kafka-schemas/
COPY packages/logger/package.json ./packages/logger/
COPY packages/tracing/package.json ./packages/tracing/
COPY apps/realtime-gateway/package.json ./apps/realtime-gateway/
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --shamefully-hoist

FROM deps AS builder
COPY packages/ ./packages/
COPY apps/realtime-gateway/ ./apps/realtime-gateway/
RUN pnpm --filter @tg-pipeline/shared-types build
RUN pnpm --filter @tg-pipeline/kafka-schemas build
RUN pnpm --filter @tg-pipeline/logger build
RUN pnpm --filter @tg-pipeline/tracing build
RUN pnpm --filter @tg-pipeline/realtime-gateway build

FROM node:20-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/realtime-gateway/dist ./apps/realtime-gateway/dist
COPY --from=builder /app/apps/realtime-gateway/package.json ./apps/realtime-gateway/

EXPOSE 3002
CMD ["node", "apps/realtime-gateway/dist/main.js"]
