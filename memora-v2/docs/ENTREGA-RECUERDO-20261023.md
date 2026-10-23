# Entrega parcial: recuerdo más claro, reparación limitada y omisiones neutrales

23/10/2026. Base f39ef0b. Solo V2; sin contenido/medios nuevos, Directus, cuentas o progreso reales modificados. Reutiliza componentes, checkpoints, journal y SRS existentes.

## Cambios observables

En las actividades de recuerdo libre ya configuradas por el contenido, las ayudas secundarias se agrupan bajo «¿Necesitas ayuda?». La historia, el audio inglés, las opciones y consultar el modelo siguen disponibles. Abrir el menú no revela la respuesta ni registra ayuda; usar una acción sí. No se activa recuerdo libre indiscriminadamente en todo el catálogo ni se exige escribir gramática antes de montar.

Pedir audio se registra como solicitud, no como prueba de que el alumno lo escuchó. Si falla, se informa y se puede seguir. Una respuesta tardía no pisa el resultado actual. Pedir ayuda y enviar rápidamente nunca se acredita como recuerdo independiente. La pista sin puente no inventa uno ni presenta el español como pronunciación inglesa.

Recuerdo libre y reconstrucción de escenas: primer intento, una reparación y modelo si persiste la dificultad. Se puede seguir con el gesto vertical existente o su control equivalente; no hay quince reintentos obligatorios. Dos fallos siguen siendo dos fallos, con vínculo entre ellos, no un acierto por consultar el modelo. El checkpoint añade el contador sin eliminar borrador/ayuda/parent de registros antiguos; cuando falta, recupera hasta dos errores de la cadena real del journal. Reanudar no crea otro intento ni otra respuesta correcta.

Consultar el modelo voluntariamente o quedarse sin tiempo en Arcade conserva la memoria e intervalo anteriores. Se registra omisión neutral, no respuesta errónea. Las respuestas incorrectas reales siguen registrando su fallo. No se reescribe ni borra historia previa, ni se garantiza saber cuándo se olvidará una palabra.

## Cómo revisar

Inicio → Continuar → una actividad ya preparada de recuerdo libre, cuando esté disponible (no todas las misiones la usan). Prueba a abrir la ayuda, recuperar una historia o elegir; al responder con apoyo no debe decir «sin pistas». Si dos intentos reales cuestan, aparecerá el modelo con salida. Salir y volver conserva resultado/ayuda sin repetirlo como acierto. No introducir errores ficticios para poblar datos reales: estos casos ya se comprueban con datos aislados.

En Arcade normal, una omisión por reloj muestra rescate y permite continuar; Sin reloj sigue disponible. Esta corrección de evidencia se aplica aunque la misión use reconocimiento entre opciones y no recuerdo libre.

## Evidencia y límites

Pruebas montadas y de dominio cubren menú sin ayuda ficticia, historia/opciones y reload, audio bloqueado/tardío, ayuda+envío rápido, dos errores/rágafas/legacy/modelo/salida, escena finita, omisión neutral y respuestas incorrectas reales. Integración y build se registran en el checkpoint del chat. Son eventos/DOM simulados, no partida física, inspección móvil, audio escuchado, diversión o retención diferida comprobadas. No se repiten controles CDP o medios403 bloqueados. Persistencia viva de una cuenta no acreditada por estos tests.

Objetivo humano:35 palabras nuevas únicas/día como mínimo de cobertura, sin máximo. Este código no completa ese catálogo ni lo finge con contadores. Curso, variedad narrativa y semántica, preparación de paquetes/medios y evaluación con el alumno siguen pendientes. Publicación, versión servida y copias restaurables se informan aparte; tests verdes no equivalen a método terminado.
