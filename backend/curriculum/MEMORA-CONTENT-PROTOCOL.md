# Protocolo de contenido Memora

## Principio pedagógico innegociable

Nunca exigir antes de preparar; nunca repetir sin propósito; siempre avanzar
hacia una conversación que el alumno pueda comprender y disfrutar.
Vocabulario, asociación absurda, recuperación, Español Espejo, construcción,
preparación de preguntas/respuestas y conversación son pasos pedagógicos
obligatorios, aunque compartan una misma escena visual. Arcade es opcional y
no sustituye ni permite saltarse esa preparación.

Arcade utiliza únicamente palabras y expresiones enseñadas y registradas;
la presencia en el catálogo o la marca de misión completada no bastan para
inventar un acierto o una exposición. Cualquier novedad se prepara antes de
evaluarla. Las rondas breves no usan cuenta atrás punitiva, vidas ni rachas
obligatorias. Salir no causa una penalización. Reconocer con opciones y
recuperar sin pistas se registran como capacidades distintas. Las pistas,
errores y reintentos conservan su evidencia; un acierto ayudado no se
presenta como dominio autónomo. Repetir debe recuperar algo que vuelve,
reducir dependencia de ayudas o aplicar una expresión conocida.

Mi evolución presenta conversaciones continuas y agrupa mensajes repetidos,
sin borrar ni sobrescribir los intentos originales de Directus. La práctica
aislada se mantiene aparte de los intercambios reales con personajes.

Este archivo rige la reconstrucción del Mundo 1 y los siguientes mundos.
Objetivo del Mundo 1: alrededor de 300 palabras útiles, seleccionadas por acciones
y conversaciones del dormitorio, baño, cocina, salón, entrada y exterior cercano.
La cifra se calcula con palabras inglesas únicas, sin contar repeticiones ni
flexiones del mismo verbo como palabras nuevas.

El objetivo inicial es aproximadamente 300 palabras únicas por mundo, no 300
por zona. Cada zona recibe las palabras necesarias para sus acciones; las
palabras reutilizadas no se vuelven a contar y el objetivo puede quedar por
debajo si no existe una asociación o uso comunicativo defendible.

## Asociación obligatoria

### Excepción aprobada por el usuario: cognados transparentes (14 de octubre)

Palabras como INFORMATION → información no necesitan puente ni historia absurda. Se usa `associationMode: cognate`, puente vacío, `cognateEvidence` con equivalencia semántica revisada y `usageExample` bilingüe. Se conserva el audio inglés, pronunciación, práctica y SRS. La semejanza escrita no prueba igual significado: falsos amigos no se aprueban como cognados. Esta decisión sustituye la exigencia de puente acústico únicamente para cognados transparentes; no autoriza nombres inventados ni puentes débiles para el resto.

1. Elegir una palabra o expresión española real y familiar. Prohibidos nombres
inventados, transcripciones como MEIK, PUD, CLOTIS, GUACH y deformaciones creadas
solo para parecerse al inglés. Una traducción no se etiqueta automáticamente
como puente. Los personajes o nombres propios requieren otra decisión del
usuario; no están autorizados como sustituto de una palabra española.
2. Documentar en `bridgeEvidence` el referente (`spanishCue`, `familiarMeaning`,
`cueType`) y la relación sonora (`soundRelation`), incluidas sus diferencias.
El audio inglés enseña la pronunciación; el puente solo ayuda a recuperarla.
Compartir una letra o una sílaba débil no justifica aprobar el puente.
3. Si no existe un puente acústico defendible, no se abandona la palabra:
   seleccionar exactamente una ruta alternativa (`direct_image`, `cognate`,
   `context_scene` o `action_scene`). `direct_image` une el audio inglés al
   concepto; `cognate` hace visible la correspondencia; `context_scene` fija
   una situación y colocación; `action_scene` representa un chunk completo.
   Estas rutas no pueden fingir que una traducción es un puente.
4. Escribir una frase de 5–12 palabras con una acción física memorable. El
puente provoca o participa en la acción que muestra el significado. Destacar
literalmente puente y significado en mayúsculas. Sin metalenguaje.
5. Revisar editorialmente sonido, familiaridad, significado y representación
visual. Registrar `editorialReview` con `verdict`, `reviewedBy` y `reason`.
`status: approved` solo después de esa revisión; los candidatos son `needs_review`.
6. Ejecutar antes de la revisión los filtros baratos: diccionario español
   versionado para puentes acústicos, longitud de 5–12 palabras, mayúsculas
   declaradas, puente distinto de la traducción y coherencia entre modo,
   campos y escena. Son bloqueos estructurales, no una certificación de calidad
   mnemotécnica.
7. Declarar `itemType: word | chunk | grammar_form`. Las flexiones deben
   enlazarse a su lema y los chunks no deben inflar el contador de palabras.

## Unidad jugable

Palabras nuevas y recuperadas declaradas; revisión repetida con la misma asociación.
Frases inglesas naturales y traducción fiel, intención cotidiana e intercambio
breve, chunks que reconstruyen exactamente las frases, distractores plausibles,
contrato visual gramatical apropiado y variantes necesarias de persona.
IPA separado de ayudas de pronunciación. Escritura gradual y recuerdo auditivo,
audio de pronunciación obligatorio, repaso espaciado y recuperación en unidades
posteriores. El reconocimiento o grabación de la voz del alumno es opcional y
no sustituye al audio modelo.
La cadena puente → inglés → significado se muestra al aprender y tras un fallo;
no se revela antes de responder en Recordar.

Cada palabra se evalúa en ambas direcciones (`imagen → inglés` y
`inglés → escena/significado`) y con una escalera de pistas: imagen sola,
situación sola, audio con contexto y ningún apoyo. Se registra acierto con y
sin pista, tiempo de respuesta, confianza y tipo de reto. Una tasa baja sin
pista en dos sesiones o un fallo relevante a 7 días devuelve la asociación a
`needs_review`; cambiarla nunca autoriza inventar un puente.

El dominio se divide en cuatro capacidades: reconocimiento escrito,
reconocimiento auditivo, recuperación sin pista y producción en contexto. La
enseñanza progresa de reconocimiento a selección, completado, producción guiada
y producción libre. La recuperación siempre precede a la solución: el alumno
escucha, imagina e intenta responder antes de ver la confirmación.

La escena del palacio es el ancla inicial, no el único contexto. Tras
consolidarla, la palabra aparece en situaciones nuevas y colocaciones reales.
Cada bloque termina con una microconversación que progresa desde piezas
ordenadas hasta una respuesta libre y una variación inesperada. Se intercalan
aproximadamente contenidos de la zona actual, debilidades anteriores,
contrastes y frases nuevas; las proporciones se pueden adaptar a la fatiga.

Las pruebas de Feynman son breves: explicar con palabras propias el significado
o distinguir cuándo usar la palabra frente a un confusor. El entrenamiento de
pronunciación separa reconocimiento, discriminación y producción inteligible;
no exige acento nativo y la evaluación de voz del alumno es opcional.

La selección del objetivo de unas 300 palabras por mundo combina frecuencia,
utilidad conversacional y desconocimiento real del alumno mediante una prueba
rápida de colocación. Se cuentan palabras inglesas únicas, sin flexiones ni
repeticiones, y el objetivo nunca obliga a publicar una asociación débil.

La selección debe personalizarse por usuario: frecuencia y utilidad ordenan
los candidatos, pero el dominio real decide qué entra en la cola. Una palabra
que el usuario ya controla no aparece en Arcade ni en una zona de recuerdo
normal, salvo como mantenimiento espaciado, confusor necesario o repaso
solicitado explícitamente. El sistema debe distinguir dominio por dirección:
reconocer `kitchen` no demuestra que pueda producirla al verla o entenderla
en audio.

Cada entrada debe declarar los confusores relevantes y cada sesión registrar
si el fallo fue de significado, audio, pronunciación, escritura, escena o
interferencia. Los filtros y los datos de progreso se conservan por versión de
asociación, con `associationId`, `version`, `supersedes` y `changeReason`.
Una asociación ya modificada no debe mezclar su calendario con el de la
versión anterior.

La cola prioriza el beneficio esperado por minuto: debilidad, utilidad
comunicativa, riesgo de olvido y valor de contraste, divididos por fatiga
estimada. La velocidad se mide después de la exactitud con un límite suave.
Varios fallos consecutivos, aumento del tiempo, dependencia de pistas o
abandono de frases deben reducir la dificultad, cambiar la actividad o cerrar
la sesión con una victoria. Una escena que requiere más esfuerzo que la palabra
se debe simplificar.

## Validación y coste

Producir por paquetes de zona. Usar generación editorial local como vía normal.
El validador comprueba estructura, coincidencias y presencia de revisión; no
puede certificar por sí solo la calidad mnemotécnica. La existencia del puente
se comprueba de forma auxiliar contra un diccionario español versionado, pero
esa comprobación tampoco sustituye la revisión humana. Para reducir sesgos,
usar una segunda revisión o una muestra independiente cuando el volumen lo
requiera.
Los controles automáticos deben devolver `pass`, `warn`, `blocked` o
`not_applicable` por regla y un `automatedGate` general.
No aprobar automáticamente porque el JSON sea válido. Revisar contenido antes
de guardarlo en Directus y publicar únicamente unidades revisadas. El audio
modelo se genera o valida antes de enseñar la palabra escrita; debe conservar
su léxico de pronunciación, voz, versión y procedencia.
Generar imágenes después de aprobar texto; describir objetos que correspondan
al modo y al significado, sin mostrar la palabra inglesa. Verificar la licencia
del modelo concreto de fal.ai y aplicar un tope de gasto por lote y por mundo.
No usar emojis genéricos como evidencia de una escena.
No llamar a OpenRouter ni fal.ai durante limpieza o validaciones locales.

Texto, audio e imagen tienen estados de revisión independientes. La publicación
solo ocurre cuando los medios obligatorios están aprobados; texto y audio
pueden probarse mientras una imagen está pendiente. En `Learn` puede mostrarse
el significado de una imagen directa, pero nunca en `Recall` antes de la
respuesta. Toda pista visual tiene una descripción accesible equivalente sin
filtrar la solución.

El progreso se minimiza y puede borrarse. Las métricas brutas no se envían a
proveedores de generación y la voz del alumno no se usa para entrenar modelos
sin consentimiento explícito.

El registro activo es `associations.json`. Las asociaciones rechazadas y JSON
antiguos permanecen en `backend/private/quarantine/`, fuera de la cola activa.
