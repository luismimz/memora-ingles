FROM node:22-alpine AS build
WORKDIR /app
COPY memora-v2/package.json memora-v2/package-lock.json ./memora-v2/
RUN cd memora-v2 && npm ci
COPY memora-v2/ ./memora-v2/
COPY backend/curriculum/world1-expansion-backlog.json ./backend/curriculum/world1-expansion-backlog.json
# TypeScript also checks the tests included in src; their progress contract
# references this shared backend module even though it is not browser-bundled.
COPY backend/extensions/memora-ai/dist/core/progress.js ./backend/extensions/memora-ai/dist/core/progress.js
RUN cd memora-v2 && npm run build

FROM nginx:1.27-alpine
COPY memora-v2/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/memora-v2/dist /usr/share/nginx/html
