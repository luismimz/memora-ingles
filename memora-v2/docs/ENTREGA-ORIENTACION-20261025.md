# Orientación al cambiar de pantalla

Inicio, Perfil, Mi evolución, biblioteca, recorrido de gramática y avisos de carga/error sitúan el foco en su título al entrar. La acción deja de depender de un botón que desapareció. El título queda fuera del recorrido normal de Tab y el foco usa preventScroll: no impone un desplazamiento de página. Tiene indicador visible al usar teclado.

Una actualización de datos, búsqueda o sincronización no vuelve a enfocar el título. Carga y error distinguen su transición incluso si React conserva el nodo. La biblioteca sigue enfocando la tarjeta previamente elegida al volver; el título no compite con ese destino ni con cargar más o limpiar filtros. El foco local de requisitos de gramática también se conserva. No toca actividad, memoria, progreso, IDs ni audio.

Pruebas de componente: entrada sin scroll, actualización sin robar foco, cambio carga/error y exclusión por retorno existente. App montada: abrir actividad, cancelar y llegar a Inicio, descartar respuesta/error tardíos sin volver a mover foco; fallo de catálogo enfoca su explicación. Inspección visual física y uso con lector de pantalla real siguen pendientes: los mocks verifican solicitudes de foco, no simulan toda la experiencia del navegador.

Recorrido humano: con teclado, Inicio → Menú → Perfil y ajustes → Mi evolución → Volver al recorrido. Al abrir palabras o gramática, el título orienta la entrada. Volver de una tanda de biblioteca conserva el destino anterior. No se cambia el orden docente ni se considera estudiar el simple hecho de navegar.

Los menús de Inicio y Gramática comparten el desplegable nativo existente y su estilo. Escape desde un menú abierto lo cierra y devuelve foco a Menú sin desplazar la página ni activar opciones. Tab, Enter y Escape cuando está cerrado no se interceptan; no se añaden trampas de foco, roles de menú de escritorio ni listeners globales. Pruebas verifican cierre, retorno al activador, acciones intactas y teclas no interceptadas.

Las opciones y guardado del encabezado de práctica usan el mismo cierre con Escape y retorno al activador. La lógica se extrae a un único hook para no duplicarla en menús y práctica. No pausa, termina, responde ni registra una actividad; las advertencias de guardado fuera del desplegable permanecen visibles. La posición y los pasos que ya mostraba el encabezado no se rehacen ni pasan a medir aprendizaje.
