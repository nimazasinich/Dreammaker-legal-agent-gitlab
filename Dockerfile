# ---- base toolchain ----
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm i
COPY . .

# ---- build client (vite) ----
FROM base AS client-build
RUN npm run build:client

# ---- build server (ts -> dist) ----
FROM base AS server-build
RUN npm run build:server

# ---- runtime: node server only (for API/WS) ----
FROM node:20-alpine AS server-runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=server-build /app/dist ./dist
COPY package*.json ./
# Only production deps if separated; keep light:
RUN npm pkg delete devDependencies || true
RUN npm ci --omit=dev || npm i --omit=dev
EXPOSE 8000
CMD ["node", "dist/server.js"]

# ---- runtime: nginx static for client w/ reverse proxy to server ----
FROM nginx:alpine AS client-static
COPY --from=client-build /app/dist/client /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
