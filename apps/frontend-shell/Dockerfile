FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend-shell/package.json ./apps/frontend-shell/
RUN pnpm install --frozen-lockfile --filter @tg-pipeline/frontend-shell
COPY apps/frontend-shell/ ./apps/frontend-shell/
WORKDIR /app/apps/frontend-shell
ARG VIEWER_URL
ARG PIPELINE_URL
RUN pnpm build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/frontend-shell/dist /usr/share/nginx/html
COPY apps/frontend-shell/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
