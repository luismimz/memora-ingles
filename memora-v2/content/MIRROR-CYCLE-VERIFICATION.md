# Ficha Espejo 01 · auditoría y verificación

Entrega: 12 de octubre de 2026. Alcance: una ficha, «Estoy jugando». No se implementan ni se publican las veinte fichas del PDF.

## Auditoría antes de modificar

- La aplicación activa del puerto 5174 sirve `memora-v2`, no `frontend`. Los dos procesos de desarrollo encontrados en ese puerto tienen el mismo directorio V2; no se detuvieron procesos ajenos. El proxy V2 apunta a Directus local 8055 y el contenedor web está configurado para V2.
- Directus tenía tres unidades, todas borradores: llaves, escritorio y cocina; ninguna publicada. La comparación con la copia SQLite anterior confirmó que sus títulos, estados y contenidos permanecen idénticos.
- `learning_events` ya existe. Su API autentica al propietario y deduplica por propietario, curso e identificador de evento. No se ejecutaron migraciones, preparadores de catálogo, generación externa ni modificaciones de permisos.
- Se reutilizan `GameCard`, el chat y sus mensajes progresivos, audio, `LearningActivity`, el diario de eventos, sincronización, reconstrucción, `EvolutionView` y las memorias de frases para Arcade/SRS.
- La explicación anterior agrupa persona/auxiliar y usa colores distintos. La paleta semántica nueva se aplica a Fichas Espejo y a su chat; no se reinterpretaron por heurísticas los JSON gramaticales antiguos.

## Respaldo restaurable

`backend/private/checkpoints/mirror-vky00T/source-before.tar.gz` contiene fuentes V2, contenido y archivos de integración relevantes. `directus-before.sqlite` se creó mediante SQLite backup y devuelve `ok` en `PRAGMA integrity_check`. Ambos son privados y no incluyen `.env`. No se restauró ni alteró la base activa durante esta comprobación.

## Cambio mínimo de arquitectura

`AtomicUnit.mirror` es opcional y contiene una ficha versionada: ejemplos revisados, piezas con función semántica, terminaciones explícitas, alcance del truco, respuestas admitidas, pistas, comparación y pregunta guiada. Su validación impide ejemplos incoherentes y respuestas incompletas. Las unidades sin `mirror` siguen usando `LanguageGame`.

`MirrorLessonExperience` reutiliza los motores anteriores y dirige este recorrido:

1. Persona escondida en «Estoy jugando», revelación de YO y escena PLAYA → PLAY → JUGAR.
2. Revelación progresiva del español espejo y del inglés alineados; contracción I + am → I'm.
3. Comparación de playing/eating/working, conservando posiciones y colores. Comer/trabajar son ejemplos léxicos guiados, no asociaciones nuevas incorporadas al catálogo ni palabras declaradas dominadas.
4. Escritura de «Estoy comiendo» sin modelo inicial. Se admiten I am eating / I'm eating, mayúsculas, espacios y apóstrofos tipográficos; no se admiten palabras omitidas o una acción distinta.
5. Pregunta de Emma enseñada como expresión receptiva antes del chat. El alumno responde «I'm working». Se conservan errores, pistas y reintentos. Emma contesta; la lectura no se interrumpe por avance automático.
6. Recuperación de «Estoy jugando» sin modelo. Cierre, historial y continuidad voluntaria.

Los colores de estas fichas son persona verde, auxiliar azul, acción naranja, negación roja e interrogativos violetas. Las funciones se indican también por posiciones y etiquetas; las terminaciones se subrayan. No se analiza COMPUTER como un verbo terminado en -er. Las animaciones de revelación respetan movimiento reducido. En esta primera entrega se usa escritura; otros tipos de evaluación necesitan su implementación y verificación específica cuando se prepare el siguiente patrón, no un comportamiento genérico inventado.

## Comprobación lingüística del PDF

El primer patrón es correcto para las acciones de ahora seleccionadas: be + verbo-ing, con I am en primera persona. No se promete que cualquier palabra acabada en -ando/-iendo deba traducirse siempre por esta construcción. El sujeto omitido en español se hace visible para estos ejemplos sin confundirlo con una traducción distinta.

No se trasladaron como reglas universales las simplificaciones de otras fichas: -ía no implica siempre would; tuviera/supiera son formas de subjuntivo español, no nombres de un pasado inglés; los hábitos pasados no requieren siempre used to; no toda preposición de cualquier pregunta debe ir al final; los participios irregulares y los usos de los perfectos necesitan contexto. «Está trabajando» no permite deducir por sí solo si la persona es él, ella o usted: hace falta contexto. La revisión de cada ficha futura será independiente.

Fuentes de contraste: British Council, Present continuous (https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/present-continuous); Cambridge, Would (https://dictionary.cambridge.org/grammar/british-grammar/would); British Council, Past habits (https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2-grammar/past-habits-used-to-would-past-simple).

## Persistencia y dominio

Cada respuesta se registra con texto original, respuesta esperada, versión, actividad, ayuda, corrección e identificador propio. Un reintento enlaza al error anterior, sin sustituirlo. Las pistas y los mensajes de Emma son actividad `authored`, no respuestas autónomas. Los mensajes del personaje pueden escucharse desde Mi evolución. El ensayo oral no evaluado conserva `correct: null`.

Las frases escritas correctamente se incorporan al SRS existente, inicialmente a una hora. Su exposición no aumenta el número de recuperaciones ni demuestra retención. No se fabrican intentos de palabras o de construcción desde el mero cierre de esta ficha. El avance de largo plazo depende de repasos posteriores reales.

## Pruebas realizadas

- Compilación de producción: correcta.
- Suite: 107 pruebas correctas en 20 archivos, diez específicas de esta ficha. Incluyen evaluación, retirada de ayudas, colores literales, contrato de servidor, reconstrucción sin duplicados, historial fuera del juego y repaso posterior.
- Navegador real: descubrimiento, contracción, tres comparaciones, error sin solución inmediata, reintento admitido, pregunta, chat con error/corrección, réplica, continuación manual, recuperación y cierre. Verificado en revisión sin escritura de progreso del alumno.
- Pantallas de prueba: 1280 × 720 y 390 × 844. La comparación móvil no desborda horizontalmente. Se corrigieron exceso de alto y fondo de tarjeta duplicado. Se restableció el tamaño original del navegador.
- Directus real: tres registros técnicos temporales comprobaron error, pista, reintento enlazado, lectura posterior y reenvíos simultáneos sin duplicados. Todos se retiraron por sus identificadores exactos, sin borrar intentos existentes.
- Regresión: las pruebas previas pasan; la misión de llaves abre con asociaciones, selector y chat de tres rondas. TURN y los otros juegos no se sustituyen.
- No se crearon cuentas, roles ni permisos nuevos: el usuario no lo autorizó. No se afirma una prueba nueva de aislamiento entre dos cuentas, ni una sesión completa autenticada de un alumno nuevo con cierre/reapertura. El recorrido de UI se verificó en revisión y la persistencia por separado contra Directus real. La comprobación conjunta en una cuenta real sigue pendiente; no se debe presentar como verificada.
- La prueba de renderizado/restauración de Mi evolución no equivale a haber jugado con la cuenta real del usuario. No se rellenó su historial con aprendizaje ficticio.

## Cómo abrir el piloto y sus límites

En desarrollo: abrir http://localhost:5174/ con una cuenta administradora y pulsar «Ficha Espejo · Estoy jugando». La ficha llega desde Directus y el juego normal guarda en esa cuenta. Al terminar, «Ver mis intentos» abre Mi evolución. Revisar el estado «Progreso guardado en tu cuenta» para comprobar la confirmación del servidor.

`?preview=1` permite inspeccionar la misma ficha, pero no guarda progreso. En revisión, el cierre lo indica expresamente.

Se añadió solo `m1-mirror-now` como borrador. `prepare-mirror-pilot.mjs` es local, no modifica otros registros, no publica y no sobrescribe un borrador que difiera del archivo. `--verify` compara exactamente el JSON guardado. El piloto no aparece por accidente en producción: el lector de borradores se limita al modo de desarrollo y respeta los permisos de Directus. La publicación y el acceso ordinario de alumnos requieren revisión editorial y comprobar los permisos y recursos de audio de publicación, antes de promoverlo.

No se han probado retención humana a largo plazo, evaluación de pronunciación ni disponibilidad de Kokoro. Se reutilizan el servicio de voz y sus alternativas existentes. No se contrató generación de imágenes o texto.

## Correcciones visuales posteriores · 12 de octubre

- La pregunta previa al chat ahora usa las piezas revisadas tanto en español como en inglés: ¿Qué/What violeta, estás/are azul, haciendo/doing naranja. No se inventa un pronombre en el español natural.
- Se corrigió la combinación del ancho máximo de Mi evolución con el padding de la home calculado desde el viewport, que reducía el área útil a una columna estrecha. La página ocupa todo el ancho; cabecera y contenido tienen un límite interior de 1140 px. El historial ya no hereda altura fija ni recorte vertical.
- Verificación en navegador: a 1920 px, contenido de 1140 px con dos columnas; a 390 px, contenido de 358 px con una columna y sin desbordamiento horizontal. Pregunta bilingüe verificada dentro del recorrido.
- Se añadió una entrada de revisión visual exclusiva de desarrollo (`?preview=1&view=evolution`), sin lectura ni escritura del historial de una cuenta. Se usa el mismo componente, no una maqueta independiente. No está habilitada en producción.
- No se modificaron datos de Directus ni se accedió a la sesión privada de Chrome. Las verificaciones de diseño se realizaron en el navegador integrado con la vista de revisión; la representación de datos reales se conserva y se comprueba mediante las pruebas existentes de restauración e historial.
- Nuevas pruebas: colores equivalentes en ambos idiomas y aislamiento de datos en revisión. Total posterior: 109 pruebas.
