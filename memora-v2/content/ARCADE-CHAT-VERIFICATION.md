# Arcade y conversaciones continuas — 12/10/2026

## Entrega

- Un minijuego opcional «Recuerda y úsalo»: recuperar una palabra y escribir una expresión previamente enseñada. Sin temporizador, vidas, racha obligatoria ni penalización por salir.
- Solo se admiten palabras con memoria real y asociación vigente, vinculadas a una frase enseñada del mismo contenido. El catálogo o una marca de finalización por sí solos no habilitan preguntas. Las opciones también provienen de palabras ya enseñadas.
- Invitación contextual tras nuevo aprendizaje o un repaso pendiente; entrada manual desde Inicio, Perfil y Mi evolución. Ninguna apertura automática.
- Modal accesible: salir con el botón o Escape mantiene montada la historia. Una ronda no reemplaza su preparación, construcción o conversación.
- La demostración de desarrollo prepara primero el contenido real y no escribe progreso.
- Intentos reales, pistas y correcciones reutilizan el diario y la sincronización existente con Directus. UUID evita duplicar un envío; reconocimiento, ayuda y recuperación independiente permanecen diferenciados. El repaso de palabras/frases usa los calendarios existentes.
- Mi evolución proyecta los diálogos en un chat continuo por personaje. La práctica gramatical y Arcade tienen su apartado, no se hacen pasar por conversaciones. Repeticiones equivalentes se agrupan; errores, reintentos y ayuda no se fusionan con aciertos autónomos. Las formas completas y contraídas conservan su texto original.
- No se eliminan registros ni se migra la base. Mensajes antiguos sin personaje conocido conservan su misión; no se inventan respuestas del interlocutor.

## Comprobado

- Compilación de producción y 118 pruebas en 21 archivos, incluidas 9 nuevas pruebas de elegibilidad, evaluación diferenciada, contrato de Directus, restauración y agrupación sin pérdida.
- Navegador real, modo revisión: preparación → error → asociación → reintento correcto con ayuda → expresión escrita con forma completa → resultado → retorno a Inicio.
- Ficha Espejo completa en revisión: descubrimiento, comparación, escritura, conversación con Emma y recuperación; apertura de Arcade al finalizar y salida con Escape devuelve a la misma ficha completada.
- Inspección visual de Arcade a 390×844 y distribución de Mi evolución. Se corrigió el fondo de tarjeta duplicado en el minijuego móvil.
- Lectura del Directus local: 120 eventos de aprendizaje existentes agrupados en un chat y un apartado de práctica, sin modificar datos. 95 eventos del alumno; 3 de cierre no son mensajes y los otros 92 se conservan en la proyección de 32 burbujas. No se copiaron conversaciones privadas a una demo pública.
- Copia del código anterior: `backend/private/checkpoints/arcade-chat-nh8hXj/source-before.tar.gz`.

## Límites de la verificación

No se han creado cuentas ni escrito intentos artificiales en el progreso del alumno. La navegación se verificó en revisión, sin guardar. El contrato de los eventos reales y su reconstrucción se verificó mediante pruebas; la lectura de Directus se comprobó con datos existentes. Falta la comprobación combinada de una ronda autenticada desde la interfaz, sincronización y reapertura en la cuenta del alumno. No se declara esa prueba realizada ni se publica contenido automáticamente.

Solo se entrega un minijuego. No se ha auditado ni completado todo el catálogo; el principio pedagógico queda establecido en el protocolo curricular, no se declara que todas las misiones antiguas lo cumplan por esta entrega.
