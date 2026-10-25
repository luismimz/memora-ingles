# Entrada segura en tarjetas

GameCard repara una entrada con foco perdido: al montarse, si el foco del documento está en el cuerpo de la página, enfoca su superficie con preventScroll. Si ya hay un campo, botón, opciones o diálogo enfocado, no lo desplaza. No aplica el foco a cada cambio narrado de stepKey ni a la aparición de feedback; tampoco responde ni avanza una tarjeta por enfocarla.

La región vertical conserva su Tab y los controles explícitos. Una tarjeta horizontal sin avance tiene tabindex-1 para aceptar esta entrada programática sin añadir otra parada de Tab. Gestos, disponibilidad del botón, reparación y motor de aprendizaje no cambian. Arcade conserva showModal/close nativos y su salida; no se crea un segundo gestor modal.

Pruebas aisladas comprueban foco perdido en ambas superficies, preventScroll, ausencia de avance, actualizaciones sin reenfocar, protección de campos/opciones/diálogos y tabindex horizontal sin avance. Se mantienen pruebas de rueda/inercia/toque/End y de controles equivalentes, así como episodios montados. Sin prueba física de teclado/lector, partida o escucha acreditadas; no se afirma resolver toda transición entre pasos con esta entrada acotada.

La superficie horizontal también protege resumen de ayuda, campos editables, piezas arrastrables y botones personalizados, igual que la vertical. Flechas y arrastre sobre esos controles no navegan ni abren la escena de ayuda. La repetición de una flecha mantenida no encadena tarjetas; una pulsación nueva fuera de controles conserva el avance existente. Selector compartido, sin otro sistema de gestos ni escrituras de progreso. Se añaden casos de cada control y de tecla repetida/nueva.

## Leer no significa continuar

La región vertical deja de capturar End, AvPág, flecha abajo y espacio para avanzar al final del texto. Son teclas de lectura/desplazamiento, coherentes con su nombre accesible. El teclado avanza por el botón explícito, activable de forma nativa; rueda/toque intencionales ya autorizados conservan sus guardas contra inercia y controles. Se retira el handler que contradecía esa instrucción, sin otro motor ni una capa de eventos alternativa. La prueba de End se actualiza al contrato nuevo: la región no captura teclas, el scroll no navega y el botón avanza una vez. Desplazamiento físico y lector de pantalla quedan pendientes de revisión real.

En horizontal, las flechas con Alt, Control, Meta o Shift y las usadas mientras hay texto seleccionado tampoco se capturan para navegar por tarjetas. Se preservan atajos del navegador y selección; una pulsación simple sin selección ni control interactivo mantiene el gesto anterior. Prueba específica de modificadores y texto seleccionado.

## Cierre del coach sin gesto obligatorio

La auditoría del constructor confirma que ya ofrece su botón de continuación horizontal y se conserva. En cambio, el cierre horizontal de GrammarCoach solo anunciaba arrastrar/flecha. Ahora activa el control explícito existente Construir frase únicamente cuando ha terminado; enseñanza y retos conservan sus botones propios sin duplicarlos. Reutiliza onContinue y no salta preparación, checks ni guardado.
