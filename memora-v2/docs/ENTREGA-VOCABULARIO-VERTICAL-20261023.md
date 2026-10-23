# Entrega parcial: palabras dentro del flujo vertical

23/10/2026. Base f2b1592. Cambio de interfaz solicitado por el usuario; referencia de interacción mem-ora40839e4, solo lectura. No copia de su motor ni modificación de su proyecto.

## Diferencias observables

En Inicio → Continuar → actividad de palabras, las asociaciones, cognados, reconstrucciones preparadas, recuerdo y resultado usan la superficie vertical existente. Lee y desliza hacia arriba al llegar al final. El indicador discreto de continuación también se puede pulsar con toque o teclado. El encabezado Recorrido sigue siendo la salida y el audio repetible no bloquea.

Se retiran los botones de navegación duplicados del cierre y de los resultados de reconstrucción/recuerdo en este modo. Las elecciones, ayudas y el envío de texto son acciones de práctica: permanecen. Una pregunta sin responder no se resuelve deslizando. La reconstrucción sigue siendo necesaria cuando corresponde; pasar con modelo no registra acierto independiente.

En el reconocimiento, el acierto continúa automáticamente después de su respuesta breve. El error mantiene su escena/historia hasta que el alumno continúe, también al recargar. El checkpoint existente guarda opcionalmente el desenlace, sin un almacén de aprendizaje nuevo. Una respuesta legacy sin desenlace conserva el contador original y muestra apoyo neutral; no inventa éxito/fallo ni otro intento. Reanudar un resultado de recuerdo libre tampoco repite su intento.

Las paradas de acción conocidas ya usan español espejo → piezas → comprensión → escritura. Esta entrega extiende coherencia al vocabulario habitual; no activa adventure entero, contenido piloto, catálogo en borrador ni medios pendientes.

## Comprobaciones y límites

374 pruebas en75archivos pasaron en integración (~3,3s), incluidas seis pruebas montadas nuevas de LanguageGame y una de checkpoint. Verifican navegación real del árbol, no llamadas directas a onFinished: asociaciones+cognado→pregunta, scroll sin respuesta, error persistente20s/reload sin duplicados, legacy, acierto→resultado→continuidad una vez, reconstrucción no saltada y recuerdo independiente reanudado. Build TypeScript/Vite y revisión de cambios correctos. El aviso de chunk principal>500kB permanece; no se ocultó ni se cambió dependencias.

Son eventos simulados y datos aislados. No equivalen a partida física, inspección móvil, audio escuchado, valoración de diversión ni retención diferida. No repetir accesos CDP o medios403 bloqueados. Publicación y artefactos realmente servidos se contrastan en el checkpoint del chat; este documento no los da por hechos antes del push.

El usuario fija ahora35 palabras únicas nuevas/día como objetivo mínimo de cobertura (1050/30días), en tandas pequeñas con uso y repaso. No son35 dominadas por mostrar fichas ni una cobertura ya completada. No se agregan contadores ficticios, cuotas bloqueantes ni palabras no revisadas. La revisión del catálogo, variedad de minijuegos, personajes y integración completa del curso siguen pendientes. El siguiente incremento es mejorar manipulación/reordenado por intención de las piezas y retirar fricción restante en ayudas sin perder preparación, historial o salida.
