# Memora v2 — reconstrucción aislada

Esta aplicación es una reconstrucción del cliente web. La versión actual, sus datos y sus perfiles de Directus permanecen intactos. `memora-v2` usa la API existente de Directus y la extensión `/memora`; no ejecuta migraciones ni generación de contenido al arrancar.

## Principios de producto

- Primero una escena coherente; después una recuperación sin pistas que revelen la respuesta; finalmente una frase producida por el alumno.
- Un solo sistema de tarjeta, gesto y posición en pantalla para todo el flujo.
- Cada fase muestra una acción principal. Los textos no deben explicar lo que la animación puede demostrar.
- El catálogo no se publica automáticamente por haber sido generado. Puente fonético, escena, imagen y frase requieren validación pedagógica antes de entrar en una unidad.
- El objetivo «B2 en 30 días» es una hipótesis de producto, no una garantía de aprendizaje ni de aprobar una certificación.

## Fase 1 revisable (borradores, no lanzamiento)

Dos escenas pasan por el mismo ciclo: PLAY/DOG/BEACH y WASH/SOAP/DOG. PLAY conserva la playa, el perro y una pelota; BEACH usa el bicho tomando el sol; DOG se reconoce con un solo perro, sin forzar un puente fonético artificial. DOG conserva exactamente su ancla y se reutiliza para fortalecer el recuerdo. El importador rechaza anclas incompatibles entre escenas del mismo lote. Primero se escuchan y conectan las tres palabras; luego se recuperan en una ráfaga de cinco segundos por palabra, con cuenta atrás visible y sin castigo si se agota el tiempo. Las opciones de escenas posteriores se revelan tras una breve anticipación. La primera escena practica dos variantes de la misma frase («I'm…» y «You're…»); la segunda añade una tercera más larga reutilizando BEACH. El constructor muestra una sola fila de correspondencias español–inglés y exige escoger entre dos piezas por hueco, como `playing` frente a `play`. Al completarla suena la frase que se construyó; no se introduce una respuesta nueva fuera de contexto. La animación de `-ing` muestra `[I] [am]` uniéndose en `[I'm]` con la voz separada y después contraída. `will` y `would` se reservan para cuando esta base sea estable. Las parejas `to play` y `to wash` están en los datos, pero **aún no tienen una introducción jugable aprobada**: no se debe afirmar que el alumno ya domina `to`. Ambas escenas son borradores sin ilustraciones aprobadas, por lo que no se publican automáticamente.

En desarrollo, `?preview=1` permite jugar y revisar los dos borradores. Con una cuenta que tenga política de administración en Directus, «Revisión · Fase 1» permite abrir cada escena y saltar a escuchar, asociar, recordar, resultado, cada transformación, construcción y final. La revisión no registra intentos, sesiones ni progreso. La detección se hace por política administrativa efectiva, no por nombres, correos o números de perfil; no cambia ningún usuario.

Los contratos de contenido viven en `content/stage0-play-dog-beach.json` y `content/phase1-wash-soap-dog.json`. En producción, el recorrido del alumno solo muestra unidades publicadas de `learning_units` en Directus; los borradores empaquetados en el cliente solo aparecen en la interfaz de revisión administrativa. No son un mecanismo de ocultación de datos sensibles. Una cuenta con política administrativa ve «Gestionar contenido»: puede seleccionar un JSON, guardarlo como borrador, abrirlo en el juego sin registrar progreso y publicarlo cuando las tres imágenes estén aprobadas. Directus debe autorizar las operaciones de lectura y escritura de esa cuenta; la comprobación del cliente solo organiza la interfaz.

Para cargar las escenas de `content/` de una vez, `node scripts/prepare-directus.mjs --all` comprueba los archivos sin escribir. Con `--all --apply` crea o actualiza los borradores. `--file nombre.json --apply` carga uno solo; sin `--file` se usa la primera escena. El script acepta `DIRECTUS_URL` y `DIRECTUS_ADMIN_TOKEN` (o `ADMIN_EMAIL` y `ADMIN_PASSWORD`) en el entorno. `--publish` requiere `--apply` e ilustraciones aprobadas en cada palabra; úsalo solo después de la revisión editorial. No modifica usuarios, perfiles ni colecciones antiguas. Si una escena ya está publicada, `--apply` la protege contra sobrescrituras accidentales.

## Contratos existentes reutilizados

- Autenticación de Directus y `GET /api/items/learning_units/:id` para contenido publicado. La colección nueva se crea al ejecutar la importación con `--apply`; no se instala ni puebla al arrancar la app.
- `POST /api/memora/speech` y archivos de Directus para Kokoro, con voz del navegador como respaldo inmediato.
- OpenRouter y fal.ai permanecen exclusivamente en el backend existente. El cliente nunca recibe sus claves ni genera alternativas automáticamente.

## Repaso y ráfaga actuales

Cada recuerdo de una palabra actualiza un calendario local por palabra inglesa, no por posición en una escena. Así DOG conserva su historial al reaparecer con WASH. Los aciertos avanzan de 1 hora a 1, 3, 7, 14 y 30 días; una respuesta lenta acorta el siguiente intervalo y un fallo vuelve a los 10 minutos sin restar puntos. Repetir antes de la fecha no adelanta el calendario. El inicio y el perfil muestran cuántas palabras piden repaso.

La «Ráfaga» mezcla imagen→palabra, audio→significado y piezas de frases ya construidas. Cada pieza entra en su propio calendario una hora después de Construye: verla y elegirla en la primera partida no cuenta como recordarla de memoria. Solo usa vocabulario registrado por la persona y frases de escenas completadas; en vista previa usa las escenas empaquetadas sin registrar progreso. Tiene cinco segundos por elección tras la revelación de opciones, muestra la conexión cuando se falla y permite seguir jugando al terminar. Cuando una palabra supera varios repasos separados, un reto sustituye las opciones por escritura libre con 12 segundos y sin penalización. Cuando *todas* las piezas de una frase han resistido dos repasos separados, se desbloquea escribir la frase completa sin opciones ni reloj; se acepta la contracción o su forma expandida. La frase tiene su propio calendario: construirla con opciones no cuenta como producirla de memoria. La vista previa enseña ambos formatos sin esperar días reales. Las partidas antiguas se incorporan al calendario como primer escalón cuando se abre la ráfaga, sin atribuirles dominio a largo plazo. Falta todavía medir retención diferida por tipo de reto y sincronizar el historial entre dispositivos.

## Lo que falta antes de sustituir la versión actual

1. Curar varias unidades con puente comprobado por oído humano, escenas e imágenes coherentes, frases reales y licencias verificadas; importar y publicar en Directus con permisos de lectura para alumno.
2. Sincronizar los calendarios por palabra, pieza y frase con Directus por UUID, registrar también producción oral y medir retención real a 1 hora, 1 día, 7 días y 30 días. La escritura completa ya entra en el calendario local tras superar el repaso de sus piezas, pero todavía no es una memoria compartida entre dispositivos.
3. Añadir producción oral y escrita verificable, preguntas, conversaciones graduadas, contenido ILERNA y pruebas de acceso móvil antes de plantear B2/certificación.
4. Verificar Kokoro, OpenRouter y fal.ai en local y producción con sus servicios reales. Esta entrega solo reutiliza el endpoint de voz; no afirma que la generación de texto o imagen ya haya producido material para v2.

## Puertas de calidad para seguir ampliando el Mundo 1

1. **Cerrar la escena actual:** validar con alumnos nuevos que reconocen PLAY/DOG/BEACH sin ver la respuesta, comprenden `jug-ando` ↔ `play-ing` y pueden reconstruir y decir la frase sin pistas. Medir acierto diferido, no solo el acierto inmediato. Ajustar el tiempo del Arcade con observación real, sin convertirlo en castigo.
2. **Introducir `to` sin pantalla teórica:** diseñar una interacción breve que muestre `jugar` ↔ `to play` y luego exija reconocerla en una frase útil compuesta solo por palabras previamente adquiridas. No reutilizar el flujo de `-ing` si añade pasos vacíos.
3. **Escenas siguientes:** mantener tres anclas coherentes por escena, reutilizar al menos una palabra conocida, añadir solo una transformación nueva por vez y comprobar que cada bloque de las frases finales se ha oído y entendido antes. No inventar respuestas conversacionales por rotación de sujetos; las respuestas deben estar escritas y validadas en el contexto de la escena.
4. **Retención real:** el repaso por palabra y por pieza de frase y la primera mezcla de imagen, audio y escritura de una palabra ya están disponibles localmente; faltan métricas de acierto diferido y producción de frases completas. No mostrar «palabras dominadas» sin esas pruebas.
5. **Puerta de publicación:** imágenes finales coherentes, puente fonético revisado por oído humano, audio probado, revisión móvil y acceso administrativo a cada paso; después publicar en Directus. Solo entonces expandir volumen hacia las 100 palabras previstas y abrir los mundos posteriores.

La dificultad de producción sube sin cambiar la física del juego: primero elegir entre dos piezas conocidas; después ordenar bloques sin mostrar la respuesta; tras recuperaciones diferidas correctas, escribir una palabra y finalmente una frase corta sin opciones. La escritura no aparece por sorpresa durante la primera exposición. Para acercarse a un vocabulario amplio hacen falta muchas escenas curadas y repasos intercalados; completar una ronda no demuestra por sí solo dominio a largo plazo ni garantiza «1.000 palabras en 30 días».

## Desarrollo

`npm install` y `npm run dev` dentro de esta carpeta. El proxy local espera Directus en `http://localhost:8056`. `npm test` y `npm run build` validan la entrega.
