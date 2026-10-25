# Acciones docentes y orientación dentro de la actividad

El modo vertical de GrammarCoach ignoraba los advanceLabel revisados de cada paso y mostraba siempre «Continúa la explicación». Ahora conserva preguntas y acciones preparadas, como «¿Quién está jugando?» y «Ver cómo encajan las piezas». Cuando no hay etiqueta editorial, distingue siguiente pieza y entrada a práctica.

Una línea indica preparación/paso o práctica/reto. Es ubicación dentro de la actividad, no porcentaje de dominio; al reanudar refleja el paso real sin reiniciar ni marcar intentos. No se modifican contenido, checkpoints, ayudas, corrección, SRS ni salidas. Los recorridos no verticales conservan su comportamiento.

Verificación: 26 pruebas enfocadas; integración 572 pruebas/112 archivos; TypeScript, Vite y git diff --check correctos. Dos casos nuevos comprueban las tres acciones preparadas, transición al montaje sin saltarlo, ausencia de intentos al navegar, etiqueta alternativa y posición inicial reutilizada. Persiste el aviso de chunk inicial mayor de 500 kB. Sin inspección visual, partida ni audio escuchado: controles previamente bloqueados no reintentados. Diversión, retención y aprobación del usuario pendientes.

Prueba humana: Inicio → Continuar → encuentro gramatical preparado. La preparación indica su posición; el botón formula la acción prevista por el contenido, no una continuación genérica. Tras la última pieza se muestra la práctica y no permite continuar el reto sin responder o recibir el modelo acotado existente. Los pasos omitidos por estructura ya preparada no se presentan como completados nuevos.

## Continuidad en el constructor

SentenceBuilderCard vertical también anunciaba usar la pieza aunque aún faltaran pasos. Ahora comparte etiquetas con el modo clásico: siguiente pieza, usar piezas, siguiente frase o usar mi frase según la transición real. GameCard elimina la flecha editorial final antes de añadir su propio icono, evitando dos flechas y nombres accesibles redundantes. No cambia callbacks, tiempos, evidencia ni requisitos.

Dos pruebas nuevas comprueban preparación controlada sin intentos, bloqueo hasta montar, distinción entre frase intermedia/final y una sola flecha visual. Las pruebas de recorrido real actualizan la etiqueta esperada y comprueban un único control final en la franja, no un duplicado dentro de la conversación. Fallos iniciales detectaron expectativas antiguas del texto de los botones; corregidas manteniendo las comprobaciones de continuidad y ausencia de intentos ficticios. Build TypeScript/Vite correcto; integración final registrada en el checkpoint. Sin QA visual o diversión acreditadas.
