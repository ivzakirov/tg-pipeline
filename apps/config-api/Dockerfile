FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/kafka-schemas/package.json ./packages/kafka-schemas/
COPY packages/logger/package.json ./packages/logger/
COPY apps/config-api/package.json ./apps/config-api/
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --shamefully-hoist

FROM deps AS builder
COPY packages/ ./packages/
COPY apps/config-api/ ./apps/config-api/
RUN pnpm --filter @tg-pipeline/shared-types build
RUN pnpm --filter @tg-pipeline/kafka-schemas build
RUN pnpm --filter @tg-pipeline/logger build
RUN pnpm --filter @tg-pipeline/config-api build

FROM node:20-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/config-api/dist ./apps/config-api/dist
COPY --from=builder /app/apps/config-api/package.json ./apps/config-api/

EXPOSE 3001
CMD ["node", "apps/config-api/dist/main.js"]
