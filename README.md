# Memora: inglés en 30 días

App web (instalable en el móvil) para aprender **100 palabras al día** con el método de la palabra clave: palabra puente que suena parecido, escena absurda y palacio de la memoria. Incluye repetición espaciada y **mide si de verdad se quedan**: pruebas a +1 h, +24 h, +7 días y +30 días.

## Qué hace

| Parte | Detalle |
|---|---|
| **Sesión diaria (25 min)** | Filtro «¿la conoces?» → aprender en habitaciones de 10 palabras → repaso de cada habitación → examen. Calibración 10 → 25 → 50 → 100. |
| **Cada palabra** | IPA, pronunciación figurada, audio, palabra puente, escena absurda (con su versión en inglés), ejemplo real. «Hazme otra» (IA), «la mía» y generar imagen (IA). |
| **Repaso** | Pruebas sorpresa a +1 h, +24 h, +3 d, +7 d, +14 d y +30 d. Si aciertas pero tardas más de 9 s cuenta como «dudada». Un fallo te baja un escalón y la palabra vuelve mañana. |
| **Progreso** | Tabla del experimento por día (examen, +1 h, +24 h, +7 d, +30 d), curva global, calendario de 30 días, palabras rebeldes y lentas, exportación CSV. |
| **Práctica** | Frase escalera (una estructura por día), Mis frases (corrección y «¿cómo se dice?» con IA), conversación con IA, historia del día, dictado, pronunciación con micrófono y contrarreloj. |
| **Irregulares** | 101 verbos en 13 familias fonéticas (sing-sang-sung…), historias para los rebeldes y cajas de Leitner. |

## Arquitectura del método (v2)

- **No todas las palabras llevan truco.** `shared/classify.mjs` clasifica cada palabra en *cognado*, *fácil* (compuesta), *palabra clave*, *bloque*, *phrasal verb* o *irregular*. Solo las de palabra clave (e irregulares) llevan mnemotecnia.
- **Criterio fonético objetivo.** `shared/phonetics.mjs` compara la pronunciación inglesa **real** (CMU, vía Datamuse, con el acento marcado) con la palabra puente española, dando más peso a la **sílaba fuerte**. Bueno ≥ 65 %, flojo 52-65 %, malo < 52 %.
- **La pronunciación real y el truco van siempre separados**: la palabra puente nunca se presenta como pronunciación.
- **Primera exposición en 10-15 s.** Los retos extra (pistas por escalones y rescates «¿qué palabra puente era?» / «¿a qué palabra te lleva?») solo aparecen si fallas o en los repasos.
- **«No me funciona»**: otra asociación (IA), crear la mía (con medidor fonético y candidatas) o seguir sin mnemotecnia.
- **Estadísticas por asociación** (`/memora/mnemonic-stats`, pestaña «Progreso → Asociaciones»): retención a +1 h, +24 h, +7 d y +30 d por asociación, por origen, por calidad del sonido, por tipo de palabra y con o sin pistas.
- **Proveedores intercambiables** (`backend/extensions/memora-ai/dist/providers/`): LLM (OpenRouter), pronunciación y candidatas (Datamuse), imágenes (Pollinations gratis u OpenRouter), frases reales (Tatoeba) y voz (Web Speech, en `frontend/src/lib/speech.ts`). Se eligen con `*_PROVIDER`; el núcleo (`core/keywords.js`) no cambia.
- **Voz natural opcional**: el backend admite un servidor Kokoro compatible con OpenAI (`TTS_PROVIDER=kokoro`, `KOKORO_TTS_URL=...`). Las frases se generan una vez, se guardan en caché en Directus y el navegador vuelve a Web Speech si el servicio no está disponible. La URL y la clave permanecen solo en el backend.
- **Prueba piloto**: `content/pilot.json` (20 palabras) → informe de tiempo por palabra, recuerdo inmediato y cuestionario.

## Estructura

```
backend/    Directus 11 + extensión (extensions/memora-ai: rutas, core/, providers/) + scripts
frontend/   React + TypeScript + Vite (PWA)
shared/     Fonética, clasificación y retención (los usan servidor y navegador)
content/    day01-03.json, wordlist.txt (días 4-30), pilot.json, irregular_verbs.json
```

## Desarrollo en local

```bash
# 1) Backend (SQLite en local)
cd backend
npm install
cp ../.env.example .env        # y ajusta: DB_CLIENT=sqlite3, DB_FILENAME=./data/memora.db, PUBLIC_URL=http://localhost:8055
npm run bootstrap && npm start # deja esta terminal abierta
npm run setup && npm run seed && npm run enrich  # en otra terminal: esquema + contenido + clasificación/pronunciación

# 2) Frontend
cd frontend
npm install
npm run dev                    # http://localhost:5173 (hace de proxy de /api a Directus)
npm test                       # tests del algoritmo de repaso, respuestas y estadísticas
```

Panel de Directus: http://localhost:8055. Ahí puedes editar palabras y asociaciones a mano.

## Despliegue en Coolify

1. Sube el repo a GitHub/Gitea.
2. En Coolify: **New Resource → Docker Compose**, elige el repo (usa `docker-compose.yml`).
3. Asigna el dominio **solo al servicio `web`**, por ejemplo `https://ingles.luismontalvan.com`.
4. Variables de entorno (mira `.env.example`):
   - `APP_URL=https://ingles.luismontalvan.com` y `PUBLIC_URL=https://ingles.luismontalvan.com/api`
   - `DIRECTUS_SECRET` (`openssl rand -hex 32`), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DB_PASSWORD`
   - `OPENROUTER_API_KEY` (https://openrouter.ai/keys) y, si quieres, `OPENROUTER_MODELS`
   - Voz natural incluida: el `docker-compose.yml` levanta el servicio interno `tts` (Kokoro CPU). Si usas un servidor externo, cambia `TTS_PROVIDER` y `KOKORO_TTS_URL` para apuntar a un endpoint compatible con `POST /v1/audio/speech`; `KOKORO_TTS_VOICE` usa `af_heart` por defecto.
   - Recomendado: `AI_ALLOWED_EMAILS=tu@email` para que nadie más gaste tu saldo de IA
   - Para «¿Has olvidado la contraseña?»: `EMAIL_FROM`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD` (cualquier SMTP). Sin SMTP, la contraseña se puede cambiar desde el panel de Directus (Usuarios).
5. Deploy. Al arrancar, Directus crea solo el esquema y carga el contenido (es idempotente).
6. El panel de Directus queda en `https://ingles.luismontalvan.com/api/admin`.

## Contenido

- **Días 1-3**: 341 palabras con asociaciones escritas a mano.
- **Días 4-30**: ~2.350 palabras frecuentes por temas. Si falta su asociación, la IA la genera al vuelo la primera vez que aparece y se guarda para siempre. Para pregenerarlas y revisarlas antes:

  ```bash
  cd backend && npm run generate -- 4 10   # días 4 a 10
  ```

  Después revísalas en Directus (colección `mnemonics`). Si mejoras una, mejora para siempre.
- Para añadir un día curado a mano, crea `content/dayNN.json` con el mismo formato que `day01.json` y ejecuta `npm run seed`.

## Método (resumen)

1. **Filtro**: solo entrenas lo que no sabes.
2. **Asociar** (~15 s por palabra): la palabra puente suena como la inglesa y la escena exagerada la une con el significado.
3. **Recuperar**: examen con todo cerrado. Nada de releer.
4. **Espaciar**: pruebas justo antes de olvidar.
5. **Usar**: frases largas, escuchar y hablar. Así la imagen deja de hacer falta y la palabra sale sola.
