# Memora · Mi evolución y continuidad voluntaria

Estado: primer ciclo funcional local verificado; expansión e inmersión visual pendientes.
Fecha de revisión: 12 de octubre de 2026.
Base: las dos propuestas aportadas por el usuario; conservan la metodología de
puentes españoles reales, historia causal breve, audio auténtico, lugares estables,
recuperación sin pistas iniciales y uso comunicativo.

## 0. Entrega verificada: «Has perdido las llaves»

Se completó el recorrido real en localhost:5174 con una cuenta temporal sin permisos
de escritura sobre el catálogo. El piloto usa la bandeja de llaves de la entrada,
KEY/KIWI y PHONE/FONDO, sonido inglés separado del puente y LOOK FOR como expresión
inseparable. Introduce dos palabras: no inventa una tercera para rellenar una tarjeta.

Se comprobaron asociación, recuperación, transformación explícita, comprensión
guiada, construcción por piezas, escritura, error contextual, nuevo intento,
diálogo A/B, cambio de papel y transferencia de llaves a móvil. El micrófono sigue
siendo opcional; un ensayo oral no recibe una nota de pronunciación.

Mi evolución consulta el texto original, la corrección y el intento vinculado sin
entrar al juego. Conserva modalidad, ayudas y versión del contenido. Inicio,
Mi evolución y Perfil mantienen navegación entre sí. Las estadísticas no llaman
«aprendidas» a palabras meramente practicadas ni borran fallos por un acierto final.

Directus confirmó 30 actividades de la prueba real, además de los eventos de
memoria/calendario. Tras recargar, cerrar y abrir otra pestaña, el historial volvió
a mostrarse con «Progreso guardado en tu cuenta». Reenvíos simultáneos de los mismos
eventos no aumentaron el número de registros. Otra cuenta no pudo recuperar datos
de la primera ni añadiendo un propietario distinto a la consulta.

La prueba detectó y corrigió un salto que omitía el diálogo, el rechazo del servidor
a frases sin piezas de constructor, un porcentaje que ocultaba fallos y la exclusión
de preguntas del contador SRS. Los eventos pendientes se enviaron al reparar el
servidor, sin sustituir las respuestas originales.

Las frases del diálogo poseen calendario propio y vuelven a Arcade cuando vence.
La programación diferida y sus intervalos se verificaron con un reloj de pruebas;
no se adelantaron fechas de alumnos ni se afirma retención real a 1/7/30 días.
Se abrió Arcade desde Mi evolución y se verificó una respuesta escrita real en
su historial. No se certifica cada pantalla de todos los demás mundos.

Compilación V2 correcta y 87 pruebas locales aprobadas. Comprobación básica de
anchura móvil sin desbordamiento horizontal; no sustituye pruebas en dispositivos
reales. Las dos cuentas, actividades, permisos, rol, política y credenciales
temporales se eliminaron al acabar. No se alteró el catálogo de otras misiones.

El despliegue web apunta ahora a V2. El comprobador de arranque no prepara datos,
ejecuta migraciones de aplicación ni genera contenido. No se ejecutó el antiguo
setup-schema. Docker no está disponible aquí: la imagen de despliegue no se ha
construido ni probado en producción.

Límites: el piloto permanece como borrador accesible en desarrollo según permisos;
no está publicado para alumnos. La ilustración SVG es funcional, no la entrega
artística final. Kokoro no está activo localmente; se mantiene respaldo de voz del
dispositivo. Tutor semántico libre, evaluación de pronunciación, Feynman libre,
exportación/borrado completo de historial, pruebas reales entre dos dispositivos,
catálogo ampliado, Laboratorio ILERNA y otros idiomas siguen pendientes.

No hubo llamadas de generación a OpenRouter, fal ni ImageGen en esta entrega.

## 1. Estado inicial contrastado (antes de esta entrega)

La V2 usa React, LanguageGame, GameCard, memorias por palabra/pieza/frase,
DailyArcade, Directus y la extensión /memora. No requiere reconstrucción.

Hay dos borradores y cero unidades publicadas en learning_units en la revisión.
learning_events existe en el Directus local. El servicio autenticado guarda eventos,
reconoce reintentos y filtra lecturas por la cuenta autenticada. Se comprobó con
un registro temporal, eliminado al terminar. El propietario nunca procede del cliente.

La compilación actual pasa tras corregir el campo conversation que se había
añadido por error a chooseSlot. Las 71 pruebas existentes pasan. No representan
una prueba completa de dos navegadores ni de retención con alumnos.

Los eventos reconstruyen memorias; intentos de gramática y diálogo aún guardan
solo resultado, ayuda, actividad y fecha. No guardan la respuesta escrita,
corrección, versión del contenido, origen ni vínculos intento→corrección.
Por tanto todavía no permiten un historial conversacional real.

La práctica «Ahora tú enseñas» comprueba una explicación elegida entre opciones.
No evalúa una explicación libre de Feynman. Los diálogos usan respuestas revisadas
y coincidencia normalizada, no un tutor semántico libre. No certifican espontaneidad.
Las grabaciones de EchoPractice son temporales: se liberan al salir y no se suben.
Kokoro no está configurado localmente. La voz del dispositivo sirve de respaldo.

Problemas detectados antes de ampliar:

- El despliegue de web sigue construyendo frontend/Dockerfile, la versión antigua.
- El arranque del backend ejecuta preparadores antiguos y activa generación por defecto.
- learning_events no se integra todavía en la preparación del despliegue.
- El diario local basado en localStorage requiere pruebas de pestañas concurrentes,
  cuotas, cierre antes de enviar y recuperación. No debe perder un intento por cuota.
- Los eventos carecen de versión de esquema y orden local para marcas de tiempo iguales.
- No hay borrado/exportación por cuenta y curso con tratamiento del diario pendiente.
- La validación de payloads y migraciones no es suficientemente exhaustiva.
- Gramática y conversación nuevas no tienen aún la misma apariencia de botones
  que otras fases; falta revisar lectura, ayudas, móvil y teclado.
- No hay Mi evolución, comparación de respuestas, transferencia comprobada ni
  recomendaciones al finalizar basadas en evidencia y disponibilidad.

## 2. Experiencia propuesta

Navegación estable: Inicio · Mi evolución · Perfil. Las herramientas editoriales
permanecen para administración. El alumno entra con una acción recomendada.

Inicio muestra la siguiente misión o el repaso oportuno; permite volver a historias
vividas. Mi evolución permite consultar sin abrir un juego. Nunca se bloquea un
recuerdo ya aprendido por no estar en un repaso vencido.

La misión cierra con un objetivo concreto, un resumen de lo que realmente hizo
el alumno y la confirmación de guardado. Una continuación es principal y, como
máximo, una alternativa; «Terminar por hoy» y «Ver Mi evolución» siguen accesibles.
Descansar no resta progreso. No se inventan minutos, competencias, XP ni resultados.

Mi evolución abre una lista de misiones/conversaciones, con búsqueda por frase.
Cada detalle muestra: intención, situación, intentos originales, ayuda/corrección,
nuevo intento, palabras puente, piezas inglesas, voz modelo y próximo repaso.
Las herramientas avanzadas y filtros se incorporan solo si el volumen los exige.

## 3. Arquitectura: una sola memoria de aprendizaje

Motor lingüístico: contratos de estructuras y chunks revisados. Contienen
intención, límites del truco, piezas, ejemplos, respuestas admitidas, ayudas por
error y pronunciación. La IA no modifica reglas ni transforma una aproximación
fonética en pronunciación inglesa.

Motor pedagógico: las memorias existentes seleccionan capacidad, ayudas y fecha.
Consultar una historia no crea un acierto. Un éxito ayudado no cuenta como
recuperación independiente. Un turno fuera de contexto no demuestra transferencia.

Motor de experiencias: LanguageGame, GrammarCoach, ConversationPractice y
DailyArcade consumen los mismos contratos. Las variaciones se curan editorialmente.

Capa común: ampliar learning_events y ProgressEvent; no crear un segundo chat
ni copiar el SRS a otra colección. Un proyector genera el historial desde eventos.
Las tablas antiguas progress/attempts/sentences no se borran ni se mezclan con V2.

Cada evento nuevo debe tener schemaVersion, id estable, account derivada del
servidor, courseId, activityId, unitId, contentVersion, skillId y fecha; orden local
por dispositivo cuando comparten instante. Un intento registra texto original,
papel, modalidad, evaluación, ayudas, respuesta revisada y error concreto.
Una corrección señala parentAttemptId y su origen: regla revisada o IA.
Los eventos antiguos se siguen leyendo; la información que no guardaron no se inventa.

El mismo intento alimenta el historial y el calendario una sola vez. El historial
es una proyección consultable, no una nueva cola de repasos. Grabar no equivale
a acertar. Expresión emitida, reconocida, ayudada o autodeclarada tienen estados distintos.

La ampliación a italiano/francés usa cursos separados, contratos específicos,
voces y puentes revisados para cada idioma. No se reutilizan automáticamente las
reglas inglesas ni se ofrece un selector antes de tener un curso funcional.

## 4. Prototipo «Has perdido las llaves»

Palacio: entrada de casa. Punto fijo: bandeja de llaves. Intención: pedir ayuda
y contar qué buscas. Puente candidato: KIWI → KEY → LLAVE; se revisa por oído,
y KEYS se enseña como plural, no como una segunda palabra independiente.
Historia propuesta: «Un KIWI se traga tus LLAVES y huye de la bandeja».

LOOK FOR se aprende como expresión completa. «I'm looking for my keys» conserva
AM y FOR; el truco de pregunta mueve ARE: «What are you looking for?».
La escena no revela respuestas en la fase de recuperación.

Recorrido:

1. Presentar intención y vocabulario necesario ya adquirido o introducirlo.
2. Mostrar el puente, reproducir el sonido real y recuperar sin pista inicial.
3. Construir «I'm looking for my keys» por bloques enseñados.
4. Oír A/B; producir la respuesta; cambiar de papel para preguntar.
5. Si falta AM o FOR, explicar solo ese error y vincular la ayuda al intento.
6. Transferir a teléfono o cartera con vocabulario ya aprendido, sin mostrar solución.
7. Mostrar objetivo cumplido y continuidad voluntaria.
8. Consultar todos los intentos desde Mi evolución tras cerrar y volver a entrar.
9. Repasar después mediante la cola existente, sin duplicar exposición y recuperación.

No inventar un puente débil para rellenar tres palabras. El contrato actual exige
tres palabras: elegir acompañantes de un registro aprobado, o diseñar explícitamente
la compatibilidad de una misión de chunks sin cambiar el contrato por accidente.

## 5. Fases y criterios para avanzar

A · Estabilizar la base: despliegue V2, arranque sin generación automática antigua,
validación/versionado y guardado fiable. Prueba con dos cuentas, dos dispositivos,
reintentos, red interrumpida y cierre/reapertura. Ningún resultado cruzado o duplicado.

B · Historial mínimo: entrada «Mi evolución», conversación, intentos y correcciones
exactos, audio modelo, memoria y próximo repaso. Probar exportación y borrado propio;
las grabaciones permanecen temporales salvo consentimiento explícito para guardarlas.

C · Misión integral de llaves: completar el ciclo anterior con contenido aprobado.
Recorrido principiante en móvil/escritorio, escritura sin reloj, micrófono opcional,
ayuda por error y explicación breve. El cambio de papel y la transferencia deben
registrarse sin atribuir logros por el simple avance de pantallas.

D · Cierre y continuidad: recomendación local según repaso, contenido disponible,
vocabulario adquirido y fatiga. No se llama a una IA para elegir cada botón.
Un objetivo de 15 minutos es una orientación; mostrar tiempo solo si se mide.

E · Validación y ampliación: después de comprobar el ciclo, extender misiones,
estructuras, personajes y contenido. Feed, tutor libre, pronunciación evaluada,
Laboratorio ILERNA y nuevos idiomas mantienen su estado pendiente.

Feynman libre requiere respuestas o criterios verificables: nunca se aprueba por
longitud del texto o por contener una palabra. Retención a 1/7/30 días y transferencia
requieren intentos reales; no se rellenan comparaciones retrospectivas con IA.

## 6. Costes y puntos de restauración

Las verificaciones locales no llaman a OpenRouter ni fal. Reutilizar audio y medios
por versión de contenido. La generación creativa entra tras una spec cerrada y no
publica por sí sola. La propuesta visual usa ejemplos identificados como tales.

Conservar una copia recuperable del estado antes de cada fase. Registrar cambios,
pruebas y límites. No limpiar o descartar cambios previos del usuario para crear
un supuesto punto de partida limpio.
