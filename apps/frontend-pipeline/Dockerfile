FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend-pipeline/package.json ./apps/frontend-pipeline/
RUN pnpm install --frozen-lockfile --filter @tg-pipeline/frontend-pipeline
COPY apps/frontend-pipeline/ ./apps/frontend-pipeline/
WORKDIR /app/apps/frontend-pipeline
ARG ASSET_PREFIX
RUN pnpm build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/frontend-pipeline/dist /usr/share/nginx/html
COPY apps/frontend-pipeline/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
