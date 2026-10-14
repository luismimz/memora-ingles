# Contrato de producto Memora v2

## Regla de construcción

No se sustituye la aplicación anterior hasta que una unidad completa funcione con una cuenta de alumno en local y producción, con datos reales publicados, arte aprobado, Kokoro probado, progreso persistido y pruebas móviles. El prototipo no borra ni migra perfiles.

## Ciclo de una unidad

1. El alumno oye cada palabra antes de leerla. Tarjeta única con significado, puente fonético, dos símbolos coherentes e ilustración revisada; derecha = conectar, izquierda = recordar sin castigo.
2. Tres recuperaciones sin spoiler, respuestas en posiciones variables y una segunda oportunidad si no fija al menos dos de tres.
3. Una transformación gramatical por vez. La terminación española se separa y la pieza inglesa viaja a su lugar. Persona y traducción cambian sin alterar el verbo.
4. El alumno construye frases de longitud creciente en una sola fila. Cada tramo español queda alineado con su hueco inglés y ofrece dos opciones, incluida una confusión útil (`playing`/`to play`); se revela cada elección al acertar y el audio lee el resultado completo. Ninguna frase introduce vocabulario que no se haya presentado.
5. Un intento se registra con palabra, resultado, tiempo, pista, forma y momento. El siguiente repaso lo determina el rendimiento, no solo haber visto la tarjeta.

## Calidad de contenido antes de publicar

- Puente verificado contra pronunciación real por un revisor hispanohablante. No se evalúa similitud por escritura.
- Acción concreta, inesperada y fácil de imaginar. La imagen representa esa misma acción y solo sus objetos relevantes; el doble emoji no añade objetos huérfanos.
- La traducción es explícita y la frase es natural, completa, ligada a la escena y reconstruible con sus segmentos alineados.
- Una pregunta jamás muestra ni pronuncia la respuesta antes de que corra su temporizador.
- OpenRouter y fal.ai producen borradores. Ninguna generación pasa a publicada sin validación automática y revisión humana de una muestra representativa; los cambios de un alumno son privados salvo moderación explícita.

## Secuencia de desarrollo

1. Consolidar la primera unidad con arte real, contrato Directus y permisos de alumno; probar audio real con latencia medida y caché limitada.
2. Sincronizar los calendarios locales por palabra y pieza de frase y los intentos en Directus por UUID; medir recuperación diferida a 1 h/1 d/7 d/30 d. La primera ráfaga mixta y la escritura diferida de palabras ya existen; ampliarla con escritura de frases y voz verificable cuando la base esté asentada.
3. Escalar a 10 unidades variadas mediante el mismo renderer, probar palabras y frases con alumnado real, retirar puentes débiles y añadir input oral/escrito.
4. Añadir preguntas, negación, tiempos y conversación contextual; después mapear resultados medibles a ILERNA/Cambridge. No prometer B2 por número de tarjetas completadas.
5. Ampliar catálogo hacia 1.000 palabras solo con generación y control de calidad medidos; optimizar web antes de portar a iOS/Android.

## Métrica de aprendizaje

El éxito no es XP ni tiempo de pantalla: es acertar sin pista el significado, reconocer la voz, producir la palabra y construir una frase correcta después de días. Una unidad solo queda dominada si supera esas cuatro pruebas en repasos espaciados.

## Itinerario y preparación ILERNA

El inicio muestra un camino de unidades pequeñas y repasos vencidos. El temario de ILERNA orienta el orden y la cobertura, pero cada estructura se introduce mediante una escena, una transformación visual, producción y recuperación espaciada antes de aparecer en un simulacro. El vocabulario profesional se etiqueta por especialidad y no sustituye al inglés de uso frecuente.
