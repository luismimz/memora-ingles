# Releer la conversación en su idioma real

Cuarto incremento encadenado sobre c4df804, detectado durante revisión del recorrido estudiable. El chat ya mostraba interlocutores españoles en los nuevos usos preparados, pero Mi evolución atribuía inglés a todo mensaje del personaje y lo enviaba a playEnglish. Ahora las nuevas actividades conservan responseLanguage y promptLanguage del texto realmente mostrado.

La proyección lleva ese idioma hasta la burbuja, agrupa repeticiones sin confundir idiomas y une el prompt del intento con el mensaje equivalente del personaje. Mi evolución usa lang y voz española/inglesa según el dato explícito; respuestas escritas inglesas admitidas mantienen su modelo. Mensajes antiguos del personaje sin idioma permanecen visibles, sin atribuirles uno por heurística ni ofrecer una voz posiblemente incorrecta. Aviso específico, sin migrar o reescribir intentos previos. Las consultas de audio no añaden progreso ni evidencias de escucha.

22pruebas enfocadas/3archivos;532/104integración/build/TypeScript/diff. Caso completo chat español→respuesta→reacción→historial→tres escuchas: dos españolas y una inglesa, sin cambio del journal. Inglés explícito conserva reproducción, legacy sin idioma no la inventa; caso inglés del chat comprueba persistencia. No audio físicamente escuchado, app/móvil jugados ni diversión/retención acreditados. Sin cambios en cuentas, permisos, Directus o motores de memoria.

Ruta de revisión: completar un aviso nuevo con Nora→Mi evolución→conversación Nora→Escuchar. Accesibilidad identifica «Escuchar en español/en inglés». Bundle627,15kB/187,60gzip; aviso de tamaño pendiente, no ocultado. Copia, huellas y versión servida en checkpoint superior.
