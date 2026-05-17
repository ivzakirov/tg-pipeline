FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json ./
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
