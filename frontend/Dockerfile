# Contexto de build: raíz del repo (el frontend importa /content/irregular_verbs.json).
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci
COPY content/ ./content/
COPY shared/ ./shared/
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
