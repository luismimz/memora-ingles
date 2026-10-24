# Mantener aparato y lugar como mensajes distintos

Tras preparar las dos aplicaciones, Arcade conserva ambos chequeos propios: ON MY COMPUTER y AT MY DESK. Antes, seleccionar la última lección ocultaba la anterior; además, la deduplicación usaba la frase fuente de la unidad y podía confundir dos mensajes de escenas diferentes.

Se reutiliza el pool y límite existentes (sorpresa de uno a tres retos, sin relleno). La clave toma el mensaje realmente mostrado por la situación, con fallback a la frase del reto anterior. Dos preguntas o ranuras del mismo mensaje siguen agrupándose; contracción y forma completa siguen equivalentes. No se crea otra ronda por duplicar el array, no se desbloquea un sentido sin su propio chequeo ni se borra evidencia al preparar el siguiente.

Pruebas con datos aislados: solo ordenador preparado→solo su escena; después lugar preparado→ambos mensajes; duplicar candidatos→siguen dos; escenarios y sesiones anteriores cubiertos por pruebas enfocadas/integración registradas en checkpoint. No es una prueba de retención, variedad disfrutada por el usuario o audio escuchado. No cambia catálogo, SRS, fechas o progreso.
