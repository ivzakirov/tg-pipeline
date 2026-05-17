FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/kafka-schemas/package.json ./packages/kafka-schemas/
COPY packages/logger/package.json ./packages/logger/
COPY apps/filter-engine/package.json ./apps/filter-engine/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY packages/ ./packages/
COPY apps/filter-engine/ ./apps/filter-engine/
RUN pnpm --filter @tg-pipeline/shared-types build
RUN pnpm --filter @tg-pipeline/kafka-schemas build
RUN pnpm --filter @tg-pipeline/logger build
RUN pnpm --filter @tg-pipeline/filter-engine build

FROM node:20-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/filter-engine/dist ./apps/filter-engine/dist
COPY --from=builder /app/apps/filter-engine/package.json ./apps/filter-engine/

EXPOSE 3004
CMD ["node", "apps/filter-engine/dist/main.js"]
