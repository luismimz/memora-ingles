# Directus + extensión de IA + scripts de esquema/contenido. Contexto de build: raíz del repo.
FROM directus/directus:11.17.4
COPY --chown=node:node backend/extensions/ /directus/extensions/
COPY --chown=node:node backend/scripts/ /directus/memora/scripts/
COPY --chown=node:node backend/templates/ /directus/memora/templates/
COPY --chown=node:node content/ /directus/memora/content/
# Módulos compartidos con el navegador (fonética, clasificación, retención): la extensión los importa desde /shared
# y los scripts desde /directus/shared.
COPY --chown=node:node shared/ /shared/
COPY --chown=node:node shared/ /directus/shared/
ENV CONTENT_DIR=/directus/memora/content \
    DIRECTUS_URL=http://localhost:8055 \
    EXTENSIONS_PATH=/directus/extensions \
    EMAIL_TEMPLATES_PATH=/directus/memora/templates
CMD ["sh", "-c", "node cli.js bootstrap && (node /directus/memora/scripts/boot.mjs &) && pm2-runtime start ecosystem.config.cjs"]
