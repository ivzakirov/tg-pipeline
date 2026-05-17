FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend-viewer/package.json ./apps/frontend-viewer/
RUN pnpm install --frozen-lockfile --filter @tg-pipeline/frontend-viewer
COPY apps/frontend-viewer/ ./apps/frontend-viewer/
WORKDIR /app/apps/frontend-viewer
ARG ASSET_PREFIX
RUN pnpm build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/frontend-viewer/dist /usr/share/nginx/html
COPY apps/frontend-viewer/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
