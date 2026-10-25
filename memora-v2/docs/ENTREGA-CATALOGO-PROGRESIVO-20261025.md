# Explorar sin desplegar todo el catálogo

LearningLibrary muestra seis tandas inicialmente y permite añadir otras seis hasta verlas todas. Es presentación progresiva, no límite diario ni nuevo planificador. La búsqueda filtra todo el catálogo antes de recortar la vista; ignora mayúsculas/tildes, combina ámbito y permite limpiar. Los ámbitos vacíos no se inventan. El contador distingue contenido disponible de aprendizaje.

Al añadir tandas, el foco pasa a la primera nueva tarjeta. Al limpiar, vuelve a búsqueda. App conserva búsqueda, ámbito, cantidad desplegada y tarjeta elegida, separados por usuario/modo, en una referencia de navegación en memoria: al volver de practicar restaura la vista y enfoca esa tarjeta. No promete conservarlo después de recargar/cerrar la aplicación. Los checkpoints de práctica existentes siguen intactos.

Una etiqueta positiva «Con intentos registrados» usa learningActivity del alumno para la misma unidad/versión, también si hubo errores. Consultar un modelo o registros de otra versión no fabrican esa etiqueta. Su ausencia no demuestra que la palabra sea desconocida ni significa ausencia de toda actividad histórica. No implica dominio, cobertura ni recuerdo sin ayudas.

Retirada regla global huérfana home-mode-grid; bordes/superficies/foco usan la paleta compartida en lugar de colores heredados. Se conservan preparación, bloqueo gramatical, cargas parciales, onOpen y vuelta a Inicio.

Verificación final:570 pruebas/112 archivos, TypeScript/Vite/diff correctos. Ocho pruebas de catálogo cubren45 tandas sin techo35, búsqueda de última tarjeta, idioma/tildes/ámbito, foco, vacío, evidencia por versión y restauración. App real montada recorre Inicio→catálogo→búsqueda→más tandas→abrir→salir→volver a tarjeta, sin otro intento del alumno. El primer helper de texto de test ignoraba números: corregido el helper, no runtime para acomodarlo.

No inspección física/móvil, partida real, audio escuchado, diversión o retención acreditados; controles bloqueados no eludidos. JS585,35kB, CSS131,65kB; aviso>500kB abierto. No contenido/medios/cuentas nuevos ni importaciones de Claude.

Revisión: Inicio→Practicar por mi cuenta→Aprender palabras. Buscar una palabra, ver más tandas, abrir una y salir por Recorrido. La búsqueda y tarjeta elegida deben conservarse en esa sesión. Limpiar permite volver a explorar todo. El recorrido guiado sigue en Inicio; esta pantalla es práctica opcional.
