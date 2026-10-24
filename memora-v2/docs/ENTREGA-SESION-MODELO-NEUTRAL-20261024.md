# Consulta neutral también al cerrar la sesión

Cuarto incremento encadenado, hallazgo de revisión posterior a d0ad3d8. La ayuda ya no creaba un intento de palabra, pero el resumen histórico de sesión usaba todas las palabras como denominador. Se excluyen consultas de modelo también de ese total: consultar tres conexiones produce cero intentos, no tres fallos. Aciertos reales conservados, no se borra historial ni cambia SRS.

Contador local de consultas dentro del checkpoint existente, validado como entero no negativo y acotado a la tanda. Solo aumenta una vez por consulta neutral en tarea pendiente. Para el checkpoint transitorio anterior sin contador, recupera consultas authored/null reales del journal de la misma unidad/versión desde su última finalización, de palabras ya recorridas; desenlace actual modeled también se conserva. No se calcula dominio ni se reescriben eventos/sesiones anteriores.

38 pruebas enfocadas en cinco archivos (flujo vertical, reducer, checkpoint, perfil y cierre) correctas. Caso añadido: todas las palabras con modelo, simular checkpoint anterior sin contador, recargar, cerrar → sesión correct:0/attempted:0, sin intentos de palabra ni memoria inventados y cierre único. Build/TypeScript/diff correctos tras sustituir findLastIndex por reduce compatible con el target existente; no se amplió la versión objetivo ni dependencias. No repetir integración497/94 anterior sin cambios adicionales.

No partida física/app/móvil/audio escuchado/diversión/retención acreditados; misma limitación de inspección autorizada. El primer tramo global requiere valoración humana, no curso completo. Estado de publicación, huellas y copia en checkpoint superior. Las sesiones ya emitidas por la versión transitoria no se reescriben automáticamente.
