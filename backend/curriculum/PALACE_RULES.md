# Contrato de los Palacios de la Memoria

## Decisiones vigentes y alcance (12 de octubre de 2026)

Actualización autorizada el 14 de octubre: los cognados transparentes se enseñan sin puente ni historia forzada (`cognate`), con equivalencia semántica revisada, pronunciación y ejemplo bilingüe. Esta excepción prevalece sobre las restricciones históricas de puente obligatorio de este archivo. No admite falsos amigos ni inventar nombres para el resto del vocabulario.

El protocolo de `MEMORA-CONTENT-PROTOCOL.md` gobierna las asociaciones nuevas:
palabra o expresión española real, puente acústico documentado, microhistoria
causal y revisión editorial. Los modos alternativos descritos históricamente
abajo son referencias de diseño, no rutas autorizadas para aprobar vocabulario
nuevo. El código debe rechazarlos en la aprobación y conservar únicamente la
lectura de datos históricos.

Este documento describe tanto requisitos como objetivos futuros. No certifica
que estén implementados: diccionario español versionado, distribución 40/30/20/10,
evaluación semántica libre, transferencia a contextos nuevos y sincronización
entre dispositivos siguen pendientes. Feynman libre no se califica con longitud
de texto ni presencia de una palabra; queda fuera del juego evaluado hasta tener
una comprobación defendible. Conversaciones evaluadas usan una pregunta del
interlocutor y varias respuestas aceptables revisadas, nunca texto genérico.

Esta jerarquía es obligatoria en todo el currículo de Memora:

1. **Mundo / palacio:** entorno completo con una promesa comunicativa.
2. **Zona:** espacio físico recorrible dentro del palacio. Una habitación, plaza,
   sala, pasillo, planta o establecimiento puede ser zona.
3. **Locus:** punto visual estable dentro de una zona. Puede ser un mueble,
   objeto fijo, puerta, ventana, pared, mostrador o señal.
4. **Acción:** capacidad observable que el alumno aprende a ejecutar.
5. **Misión:** experiencia atómica anclada a un solo locus y una sola acción
   nueva. Puede recuperar acciones y vocabulario anteriores.

## Capas comunicativas obligatorias

Cada zona debe entrenar progresivamente estas tres capas:

1. **Observar:** describir qué ocurre en ese momento.
2. **Actuar:** pedir, ofrecer o provocar una acción sobre el entorno.
3. **Conversar:** preguntar, escuchar una respuesta natural y responder.

Una misión no tiene que enseñar las tres capas a la vez, pero debe declarar
cuál entrena y a qué intercambio cotidiano pertenece. La secuencia de una zona
debe acabar cubriendo las tres.

## Reglas innegociables

- Un mueble u objeto no puede declararse como zona.
- Todo locus debe estar registrado en `worlds.json` dentro de su zona.
- Toda misión debe declarar `world`, `zone.id`, `zone.locus` y `action`.
- Toda misión debe declarar `communication.layer`, `communication.intent`,
  `communication.interlocutor`, `communication.userTurn` y
  `communication.reply`.
- `action` debe existir en la lista de acciones del mundo.
- Una misión introduce una sola transformación gramatical.
- Una estructura todavía no enseñada solo puede aparecer como bloque auditivo
  indivisible; no se analiza ni se exige producirla.
- No existe un máximo de palabras por mundo. El vocabulario crece hasta que
  todas sus acciones puedan comprenderse y producirse con recuerdo diferido.
- DeepSeek nunca inventa zonas, loci, acciones ni palabras; solo redacta la
  capa creativa de una especificación ya aprobada.
- DeepSeek tampoco inventa interlocutores, intenciones, preguntas, respuestas,
  frases objetivo ni distractores.
- Ninguna misión se publica automáticamente.
- Toda palabra nueva exige `acoustic_bridge` con un disparador español real.
  Si falta uno defendible queda pendiente. Los chunks se enseñan en situaciones
  comunicativas con palabras ya introducidas; no se crean puentes inventados
  para una expresión completa.
- El objetivo de vocabulario se cuenta con palabras inglesas únicas, no con
  flexiones ni repeticiones. La selección parte de frecuencia y utilidad en
  las conversaciones del mundo, y se filtra con una prueba breve de
  colocación y otra de dominio previo del alumno. Las 300 palabras son un
  objetivo por contexto, no una cuota que justifique asociaciones débiles.
- Cada entrada declara `itemType`: `word`, `chunk` o `grammar_form`.
  Las flexiones se vinculan a su lema y no inflan el contador de vocabulario;
  los chunks se contabilizan como unidades comunicativas, no como varias
  palabras nuevas.
- El objetivo inicial es aproximadamente 300 palabras únicas por mundo. Cada
  zona recibe solo las palabras necesarias para sus acciones, una palabra se
  puede reutilizar sin volver a contarla y el objetivo puede quedar por
  debajo si no hay uso comunicativo o asociación defendible.

## Absurdo con causalidad local

La imagen puede romper la realidad, pero no la relación entre lugar, acción e
intención. Debe ocurrir en el mundo y locus declarados, mostrar una sola acción
física y ayudar a recuperar el significado. Una rareza decorativa que no cause
la acción no es una asociación válida.

## Contrato de asociación visual

- `acoustic_bridge`: el puente suena suficientemente parecido y debe aparecer
  transformándose, chocando o actuando sobre el significado. Nunca se muestra
  el puente aislado como si fuese la traducción.
- `direct_image`: para una palabra concreta sin puente español fiable. El audio
  inglés se une directamente a una imagen absurda, inequívoca y estable. Es
  preferible a inventar una semejanza acústica falsa.
- `cognate`: para cognados transparentes o casi transparentes. La escena
  representa el concepto y destaca la correspondencia entre ambas lenguas; no
  se disfraza la traducción como puente.
- `context_scene`: para palabras abstractas, funcionales o polisémicas. La
  escena fija una situación y una colocación cotidiana que fuerzan el
  significado correcto.
- `action_scene`: para chunks y expresiones. Una acción visible y el turno del
  interlocutor recuperan la expresión completa, sin reducirla a una palabra
  aislada.
- Toda ruta alternativa conserva `meaning`, `anchor`, `sceneTerms`,
  `meaningTerms` y `associationMode`; solo `acoustic_bridge` puede declarar
  `bridgeEvidence`. En todos los casos el audio inglés es obligatorio antes de
  mostrar la palabra escrita.
- Una asociación debe conservar `status`, `bridgeEvidence` cuando corresponda
  y `editorialReview`. Los estados `needs_review` y `rejected` no entran en la
  cola de aprendizaje; `rejected` se conserva en cuarentena. `approved` solo
  es válido con `editorialReview.verdict`, `reviewedBy` y `reason` completos.
- En ausencia de ilustración, la interfaz debe mostrar explícitamente
  `PUENTE -> SIGNIFICADO`; para imagen directa debe rotular el significado.
- La misma palabra conserva siempre su ancla aprobada en todas las misiones.
- Una ilustración no puede mostrar la palabra inglesa, su traducción escrita ni
  texto que revele la respuesta. La imagen y el audio deben registrar
  procedencia, versión del modelo, léxico o guía de pronunciación y licencia.
  La generación visual tiene un tope de gasto configurado y solo ocurre tras
  aprobar el texto; las validaciones locales no llaman a OpenRouter ni a fal.ai.

## Revisión, publicación y filtros baratos

- Cada candidato empieza en `needs_review`; una asociación rechazada pasa a
  cuarentena y queda fuera de la cola activa. Solo una revisión editorial
  registrada puede llevarlo a `approved`.
- Antes de la revisión humana se ejecutan controles no certificadores:
  existencia del puente en un diccionario español versionado cuando el modo es
  `acoustic_bridge`, 5–12 palabras en la escena, presencia literal de los
  términos destacados, ausencia de que el puente sea solo la traducción y
  consistencia entre modo, campos y escena. Un fallo bloquea la publicación,
  pero pasar estos controles no demuestra calidad mnemotécnica.
- Estos controles locales devuelven por regla `pass`, `warn`, `blocked` o
  `not_applicable` y un `automatedGate` general. No llaman a OpenRouter, fal.ai
  ni a ningún proveedor externo, y nunca sustituyen la revisión humana.
- La interfaz presenta cada control por separado. Un `warn` se muestra para
  corrección editorial, pero no bloquea por sí mismo; solo un `blocked` cierra
  el `automatedGate` y evita instalar la asociación.
- Antes de instalar, la administración muestra una vista previa de la ruta,
  escena, versión, audio, guía de pronunciación y procedencia de medios. Esta
  vista previa es editorial: no publica, no cambia la memoria y no permite
  inferir la respuesta desde una imagen.
- La instalación administrativa repite los controles críticos: exige
  `status: approved`, `editorialReview` completo y audio aprobado. Para
  `acoustic_bridge` exige `bridgeEvidence`; para las rutas alternativas exige
  `anchor` y `meaningTerms` presentes en la escena. Un archivo válido como
  JSON pero incompleto editorialmente se rechaza antes de tocar la memoria.
- La revisión humana debe poder invalidar el filtro automático y registrar el
  motivo. Para escalas grandes se recomienda segunda revisión o muestreo
  independiente de asociaciones aprobadas.

## Crecimiento y recuperación

- Una palabra no se consume en su tarjeta: vuelve en descripción, petición,
  pregunta, respuesta, audio, construcción y, más adelante, escritura.
- Las misiones crecen de `3 nuevas` a `2 nuevas + 1 recuperada` y después a
  `1 nueva + 2 recuperadas`, según dominio; no como cuota rígida por mundo.
- La respuesta de otra persona forma parte del aprendizaje. El ciclo completo
  es `preguntar -> escuchar -> comprender -> responder`.
- Cada palabra mantiene un calendario por dirección y por tipo de recuperación:
  `imagen -> inglés`, `inglés -> significado`, `significado -> inglés` y
  `audio -> significado`. La asociación se repite sin cambiar mientras siga
  vigente, pero las pistas se retiran por escalera: imagen sola, situación
  sola, audio con contexto y recuerdo sin pista.
- El alumno debe recuperar tanto la palabra desde la escena como la escena
  desde la palabra. Se registra si acertó con pista, sin pista, por dirección,
  tiempo de respuesta y confianza; la exposición no cuenta como dominio.
- Una asociación entra en revisión si su tasa de acierto sin pista queda por
  debajo del umbral configurado en dos sesiones o si falla de forma relevante a
  7 días. La revisión puede cambiar de ruta (`acoustic_bridge` a
  `context_scene`, por ejemplo), pero nunca añade una semejanza inventada.
- El repaso diferido se identifica por el tiempo real desde el último intento:
  solo una respuesta después de al menos siete días puede incrementar
  `sevenDayFailures`. La misma respuesta no se cuenta dos veces ni se confunde
  con una exposición inmediata.
- La configuración mínima de revisión declara `minAttempts`,
  `noCueAccuracyBelow`, `maxCueDependency` y `sevenDayFailureCount`. El
  sistema distingue fallos de significado, reconocimiento auditivo,
  pronunciación, escritura, recuperación de escena y confusión con un
  distractor; cada uno activa una intervención diferente.
- Cada palabra declara confusores fonéticos, ortográficos o semánticos cuando
  existan. La recuperación debe comprobar también que el alumno selecciona la
  palabra correcta frente a esos confusores.
- Las asociaciones son versionadas. Un cambio conserva el historial, registra
  `supersedes` y `changeReason`, y recalibra el calendario de la nueva versión
  sin borrar los datos de la anterior. La nueva versión empieza con intentos
  independientes; el rendimiento histórico queda archivado para comparar si
  la sustitución mejora la recuperación diferida.
- La instalación de una nueva versión es una operación explícita sobre
  contenido ya aprobado. El dominio de memoria no crea puentes ni escenas:
  solo archiva la asociación anterior y deja la nueva lista para el primer
  intento.
- La comparación entre versiones usa primero la recuperación sin pista
  (`recall`) cuando ambas versiones tienen esa evidencia. Solo usa el
  agregado general como respaldo y debe indicar esa base; no se mezclan
  reconocimiento, audio y producción para declarar una mejora engañosa.
- La cola de revisión es explícita y estable: primero ordena por fallos
  diferidos a siete días, después por precisión de recuperación y finalmente
  por fallos acumulados. Una pantalla o herramienta editorial debe consumir
  esta cola común, no crear su propio orden.
- La administración muestra esta cola con la evidencia mínima necesaria para
  decidir: versión activa, fallos diferidos y precisión de recuperación. La
  acción editorial posterior sigue siendo cargar, revisar y aprobar una nueva
  escena; la cola nunca publica ni sustituye contenido por sí sola.
- Cuando existe historial, la cola muestra también la base de comparación
  (`recall` u `overall`), los intentos y la precisión de la versión anterior y
  la actual. La ausencia de datos se muestra como tal y nunca se interpreta
  como una mejora.
- Las escrituras de contenido requieren una identidad administradora tanto en
  la interfaz como en el servicio cliente. Ocultar un botón no es un control
  suficiente; Directus debe mantener además sus permisos de colección.
- El repositorio incluye una auditoría reproducible de la política `Learner`.
  `npm run audit:permissions` verifica sin arrancar Directus ni leer secretos
  que el alumno solo lee unidades publicadas y no puede escribir
  `learning_units`. La instancia real debe verificarse adicionalmente tras
  ejecutar la configuración en el entorno correspondiente.
- Texto, audio e imagen tienen estados independientes (`approved`,
  `needs_review`, `rejected`). La publicación queda bloqueada si falta un
  medio obligatorio o si alguno está rechazado; el texto puede probarse con
  audio aprobado aunque la imagen siga pendiente.
- Toda asociación aprobada debe registrar para el audio su procedencia, guía
  de pronunciación y licencia. Si existe imagen, también debe registrar
  procedencia y licencia, además de la versión del modelo cuando corresponda.

## Dominio lingüístico

- El dominio se mide por capacidad, no con un único `known`: `recognition`
  (palabra escrita), `auditory` (palabra en audio natural), `recall`
  (recuperación sin pista) y `production` (uso correcto en una frase o turno).
  Una capacidad puede estar dominada mientras otra sigue débil.
- La enseñanza sigue esta progresión: reconocimiento, selección, completado,
  producción guiada y producción libre. Las opciones múltiples son apoyo
  temprano, no la prueba principal de dominio.
- La escena del palacio es el ancla inicial. Después la palabra se intercala
  en casa, trabajo, calle, conversación, preguntas, respuestas, negación y
  tiempos ya enseñados. Una palabra no se considera transferida hasta funcionar
  en al menos un contexto nuevo.
- La recuperación precede a la solución. El alumno escucha, imagina, intenta
  decir o completar la respuesta y solo después recibe confirmación y una
  corrección mínima.
- Cada bloque termina con una microconversación. La progresión es ordenar
  piezas, completar una pieza, elegir una respuesta, responder con apoyo,
  responder libremente y responder ante una variación inesperada.
- La sesión intercala contenido: aproximadamente 40% de la zona actual, 30%
  de debilidades anteriores, 20% de contrastes y 10% de frases nuevas o
  sorpresa. Son proporciones orientativas, no cuotas rígidas.
- Como objetivo futuro, las pruebas Feynman serán breves y funcionales: explicar el significado con
  palabras propias o elegir cuándo usar una expresión frente a su confusor.
  No se exige una explicación larga ni inglés perfecto para demostrar
  comprensión.
- La pronunciación se separa en reconocimiento auditivo, discriminación de
  sonidos y producción inteligible. No se exige acento nativo ni se confunde
  acento con comprensión; la evaluación de voz del alumno es opcional.

## Selección adaptativa y carga cognitiva

- Cada candidato recibe una prioridad basada en debilidad, utilidad
  comunicativa, riesgo de olvido y valor de contraste, dividida por fatiga
  estimada. El siguiente ejercicio debe aportar más aprendizaje esperado por
  minuto, no simplemente consumir contenido.
- La dificultad temporal se introduce después de consolidar exactitud. Se puede
  registrar el tiempo de respuesta y usar un límite suave de unos segundos,
  pero nunca penalizar al principiante solo por ser lento.
- La sesión reduce novedades, cambia a una actividad fácil o termina con una
  victoria si detecta varios fallos consecutivos, aumento sostenido del tiempo,
  uso constante de pistas, respuestas aleatorias o abandono de frases.
- El perfil muestra la capacidad más débil y sus aciertos observados, además
  de contar los errores por tipo. Estas métricas describen el comportamiento
  registrado en el navegador; no se presentan como una certificación de
  retención ni como una medida científica de competencia.
- Una asociación no debe ser más compleja que la palabra que enseña. Si el
  alumno tarda más en reconstruir la historia que en recuperar la palabra, la
  escena se simplifica o se sustituye.

## Cola adaptativa y tiempo del usuario

- Antes de incluir una palabra en Arcade, una zona de recuerdo o una prueba de
  colocación, consultar el dominio individual del usuario por lema y por
  dirección de recuperación. No usar solo el número de exposiciones.
- Una palabra se considera `known` para una dirección cuando supera el umbral
  configurado sin pista en el mínimo de intentos y mantiene rendimiento en el
  repaso diferido. Las palabras `learning`, `weak` y `unknown` tienen prioridad
  descendente en la cola.
- Las palabras `known` se excluyen de la cola normal de Arcade y de las zonas
  de recuerdo. Solo vuelven como mantenimiento espaciado, como confusor
  necesario o en una sesión explícita de repaso; el mantenimiento debe ser
  corto y limitado por porcentaje.
- Nunca contar como dominio una respuesta obtenida con la cadena puente,
  traducción o pista completa. Una palabra conocida en
  `inglés -> significado` puede seguir pendiente en `significado -> inglés`,
  `audio -> significado` o producción escrita.
- Si una palabra ya dominada aparece repetidamente por falta de candidatos,
  no rellenar la sesión con ella: mostrar una cola más corta, ofrecer otra
  zona o indicar que no hay material nuevo suficiente.
- La interfaz debe mostrar el motivo de una repetición (“mantenimiento”,
  “confusor” o “repaso pendiente”) y no presentar como nuevo lo que el alumno
  ya controla. El objetivo es maximizar aprendizaje útil por minuto y mantener
  variedad, sorpresa y sensación de avance.

## Calidad operativa y privacidad

- Los filtros automáticos devuelven resultados explícitos por control:
  `pass`, `warn`, `blocked` o `not_applicable`, además de un
  `automatedGate`. Un JSON válido no equivale a una asociación publicable.
- Tras dos rediseños fallidos y una muestra suficiente de recuperación, una
  palabra puede marcarse `deferred` para otro mundo o contexto; no bloquea el
  resto del currículo.
- `direct_image` puede mostrar el significado durante `Learn`, pero no durante
  `Recall`; tras un fallo sí puede mostrarlo. La descripción accesible tampoco
  debe filtrar la respuesta antes de tiempo. Toda pista visual tiene
  equivalente textual y el audio tiene repetición y alternativa accesible.
- Las métricas de progreso se minimizan, pueden borrarse y no se envían a
  proveedores de generación. La voz del alumno no se usa para entrenar modelos
  sin consentimiento explícito.

Ejemplo válido: `La Casa Viva > Dormitorio > Escritorio > describir lo que
ocurre ahora`.

Ejemplo inválido: `La Casa Viva > Escritorio`.
