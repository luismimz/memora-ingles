# Entrega parcial: asociación, sonido y ayuda de construcción

Alcance: V2 sobre main4dedd90, sin activar borradores/pilotos ni importar contenido. No es la entrega del curso ni del nuevo recorrido completo. Decisión humana22/10: publicar incrementos para revisarlos durante el desarrollo.

Cambios observables:

- La asociación dice RECUERDA CON, no SUENA A. Se distingue el gancho español de la pronunciación inglesa; explicación de diferencias disponible solo si ya está escrita en el contenido. No se inventan equivalencias ni historias para cognados.
- El recordatorio de Arcade conserva palabra, puente e historia y añade la distinción de pronunciación. No abre explicación larga contra el reloj ni cambia cadencia/SRS.
- El constructor muestra una explicación textual después de elegir una pieza errónea y la mantiene hasta corregir/cambiar pieza. Usa correspondencias ya escritas en la frase/vocabulario; si hay ambigüedad o falta sentido, no inventa traducción. El journal de LanguageGame conserva el mismo feedback y los intentos/parentAttempt/ayudas existentes. Esperar no registra otro intento.

No cambia requisitos, IDs, completados, posiciones, gramática, catálogo ni permisos. No añade evaluación fonética. No incorpora CAT/PEN/BOOK, PLAY/DANCE, escenas/medios de candidatos, techo diario o flujo opt-in nuevo. El constructor todavía no está conectado al recorrido habitual de todos los alumnos; esta entrega no afirma resolver esa conexión.

Revisión de software:350pruebas/71archivos y build correctos; datos aislados/API/audio simulados. La prueba de componente comprueba error, espera60s, ayuda visible y corrección sin intentos por esperar. No inspección/partida móvil ni escucha humana de nuevos medios; no hay medios nuevos. Bundle498,98kB min/154,00gzip, sin aviso>500kB.

Prueba del usuario: entrar en Inicio/Continuar hasta una palabra con puente español; comprobar RECUERDA CON, distinción del sonido y botón inglés. En un recordatorio de Arcade comprobar la misma relación. Si el recorrido disponible abre CONSTRUYE, una elección errónea debe mostrar explicación que no desaparece con la animación y se limpia al corregir. No reiniciar progreso, crear cuenta o cambiar permisos para alcanzar esa pantalla. Si no aparece, comunicarlo: no demostraría que el constructor ya está integrado.

El estado de push/despliegue/versión servida se registra en el checkpoint del chat después de verificarlo, no se presupone por este documento. La revisión de claridad/fluidez/diversión del usuario queda pendiente.
