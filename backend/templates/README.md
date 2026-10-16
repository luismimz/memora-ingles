# Invitaciones de Memora

La imagen Directus copia esta carpeta y configura `EMAIL_TEMPLATES_PATH`.
Solo se sustituye `user-invitation`; las demás plantillas siguen siendo las de Directus.
El hook `memora-invitation` personaliza el nombre del remitente, el asunto predeterminado y la alternativa de texto plano, sin cambiar destinatarios ni URL/token nativos.

Verificación sin enviar correo: `node --test backend/scripts/test-invitation-email.mjs`.
El enlace de activación nativo se conserva. Tras activar, el mensaje enlaza a la Home de Memora; no se implementa una redirección automática ni se cambian roles.
Despliegue: reconstruir Directus desde este Dockerfile. Revertir el commit restaura el correo original; no hay migraciones ni cambios en usuarios/progreso.

## Revisión de entrega (2026-10-16)

DNS público observado, sin modificaciones:
- SPF: `v=spf1 include:_spf-eu.ionos.com ~all`.
- DMARC: `p=quarantine; pct=100` (no debilitar para evitar spam).
- CNAME `s1-ionos._domainkey` y `s2-ionos._domainkey`: presentes, apuntan a IONOS.
- CNAME `s42582890._domainkey`: sin respuesta. IONOS documenta actualmente los tres selectores; confirmar con el servicio contratado antes de añadir el tercero.

Falta comprobar el SMTP realmente utilizado por Directus en producción y `Authentication-Results` de un mensaje recibido (SPF, DKIM con selector y dominio, DMARC). La presencia de DNS no prueba que un mensaje pase la autenticación. No reenviar invitaciones automáticamente ni publicar cabeceras con destinatarios o enlaces personales.
