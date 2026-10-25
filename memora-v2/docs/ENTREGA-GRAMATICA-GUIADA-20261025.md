# Una entrada guiada también para las frases

Se sustituye la entrada de Gramática basada en mapa abierto y barra de modos por una próxima práctica clara. Usa la misma selección current/resume/completed/locked ya existente: no otro planificador ni nuevas reglas de preparación.

- La frase disponible tiene una acción «Continuar con esta frase». Si estaba completada, «Volver a practicar». Si faltan palabras, se explica y conserva el enlace de preparación. Una ruta vacía no simula continuación.
- Mapa bajo «Ver mi recorrido de frases», cerrado y montado solo al abrir. Seleccionar parada bloqueada mantiene la ayuda específica, foco y onPrepare. Arcade, evolución y tema siguen disponibles en Menú; Inicio sigue visible.
- La ruta completada se puede volver a practicar aunque cambien requisitos actuales, igual que el mapa anterior. El número de prácticas registradas no se presenta como dominio.
- Retirados JourneyHome.tsx antiguo (sin imports/consumidores encontrados en todo V2, tampoco carga dinámica) y57 selectores exclusivos. App y pruebas usan JourneyHomeV2. Se conservan journey-menu/brand/header y helpers de dominio usados por otras pantallas. Componente y estilos retirados recuperables en95536ea y su copia de código, sin tocar datos.

Archivos: GrammarJourney.tsx/test, nueva grammarJourney.css, styles.css y eliminación JourneyHome.tsx.34 pruebas enfocadas/4archivos,558/110 integración, TypeScript/Vite/diff correctos. Test montado verifica reanudación real, abrir mapa, callbacks y ninguna escritura al navegar; preparación requerida y ruta vacía cubiertas. CSS137,77→131,20kB/gzip26,23→25,32kB; JS627,03kB, aviso >500kB abierto. No velocidad móvil medida.

No inspección visual física/móvil, partida, audio escuchado, diversión ni retención acreditados. No repetir o eludir controles bloqueados. No contenido/editorial/medios nuevos ni modificación de usuarios/intentos/progreso.

Revisión humana: Inicio→Practicar por mi cuenta→Gramática. Debe verse la frase actual o sus palabras pendientes antes del mapa. Continuar→salir→volver conserva la posición independiente. Abrir recorrido permite explorar y preparar otra parada; Menú conserva accesos secundarios. La simplificación no termina el rediseño global ni valida el método por tests.
