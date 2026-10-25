# Mi evolución: orientación antes que archivo

La página abría directamente una lista de chats. Ahora empieza por la última práctica registrada, recuentos separados de respuestas/aciertos escritos sin ayuda/aciertos con ayuda u opciones y un siguiente paso claro hacia el recorrido. Los reintentos son respuestas, no palabras nuevas. Modelos neutrales y cierres no aumentan esos recuentos. Las fechas inválidas no se usan para ordenar la última práctica.

El estado de repaso reutiliza loadLearningProfile, sin otro scheduler: oportunidades sugeridas entre palabras, piezas y frases. Una oportunidad futura no impide aprender antes. La acción principal vuelve al recorrido; no promete abrir una ronda concreta ni habilita contenido. Recuerdos anteriores sin respuestas detalladas se conservan y se identifican como tales, sin inventar un historial.

Conversaciones/intententos y palabras/frases/práctica extra quedan como detalles secundarios. Se conserva la búsqueda, selección, idioma de audio, mensajes originales, repeticiones y correcciones. Al abrir el archivo se vuelve a la parte final del chat; al salir se detiene audio. Se retira el CTA Arcade competidor del primer plano, pero permanece dentro de práctica extra. La vista de inspección no lee historial ni perfil personal.

Verificación: cinco pruebas nuevas de resumen vacío, repetición/apoyo/modelos, recuerdos legacy/repaso vencido, revisión sin lecturas y oportunidad futura. Se conserva la comprobación de idiomas y se actualiza la aserción antigua del contador en mirrorLesson.586 pruebas/113 archivos; TypeScript/Vite/diff correctos. App montada recorre Perfil→Mi evolución→acción principal→Inicio sin escribir intentos. No inspección visual física, partida ni audio escuchado; controles previamente bloqueados no reintentados. No se acredita diversión, dominio, cobertura editorial o retención.

Prueba humana: Inicio → Mi evolución (o Perfil y ajustes → Mi evolución). Ver el resumen y «¿Qué toca ahora?», abrir Conversaciones e intentos para buscar, volver por la acción principal. Los datos dependen del historial de la cuenta; no se crean respuestas para llenar el resumen. Aviso de bundle inicial>500kB aún presente; no benchmark móvil.

## Encontrar un recuerdo sin desplegar todo el archivo

El listado inline de todos los recuerdos se sustituye por EvolutionMemoryLibrary, presentación de los mismos WordMemory/SentenceMemory (no un motor de selección o memoria). Muestra seis registros y permite abrir otros seis hasta el final, sin límite diario. La búsqueda inglés/español ignora acentos y consulta todo el archivo antes de limitar lo visible. Limpiar vuelve a seis y al campo; mostrar más enfoca el primer recuerdo nuevo.

Se conserva escena/puente/audio y se muestran fechas de repaso sugeridas tanto para palabras como para frases; una fecha inválida se declara no registrada. El recuento es de registros, no de palabras nuevas o dominio. No modifica SRS, historial ni publicación. El componente deja de generar todo el DOM de recuerdos aunque el apartado esté cerrado. Tres casos nuevos cubren14 registros hasta el final, foco, búsqueda de un recuerdo oculto/acento/inglés, limpiar, vacío, fecha inválida y callbacks de audio/práctica. El caso inicial de test requirió normalizar espacios del texto compuesto del botón, sin cambio de producto para resolverlo.

Integración final589 pruebas/114 archivos; TypeScript/Vite/diff correctos. La carga de Evolución sigue siendo opcional; el aviso de tamaño inicial permanece. Sin benchmark ni validación visual acreditados.
