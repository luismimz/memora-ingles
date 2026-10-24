# Avance visible fuera del contenido

Petición humana: simplificar cómo se actúa, no solo el método o los colores. Sobre18f111b.

GameCard vertical separa lectura y acción: contenido desplazable, franja de avance fuera del scroll, etiqueta concreta y botón de ancho completo. No hay que descubrir un gesto o buscar el final para ver cómo seguir. Se conservan los gestos opcionales, teclado, movimiento reducido, salida de PlayHeader y las mismas condiciones onAdvance/revealFooter. Un ejercicio pendiente no ofrece salto; lectura y navegación no escriben evidencia.

Cambios: GameCard.tsx, verticalEpisode.css, playFlow.css, GameCard.controls.test.tsx y GameCard.vertical.test.tsx. La franja ocupa espacio propio flex, no tapa respuestas o texto mediante una superposición fija. Safe-area inferior y textos largos considerados en CSS. Prueba montada verifica que botón es hermano del scroll, funciona sin desplazar, doble toque único; pruebas previas conservan inercia/selección/inputs/cancelación/permiso retirado/lectura del feedback.

16 enfocadas/3archivos y552 pruebas/109archivos de integración, build TypeScript/Vite y diff correctos. Aviso principal626,05kB conservado. Revisión de estructura/cascada, no inspección visual física ni partida móvil, audio escuchado, diversión o retención. Controles bloqueados anteriormente no se reintentan ni eluden.

Recorrido: inicio→Continuar→tarjeta de asociación/enseñanza/resultado que permite seguir. La acción aparece bajo la zona de lectura. En pregunta pendiente, montar/responder sigue siendo necesario; al reanudar conserva el checkpoint existente. No activa borradores, cuentas, catálogo ni nuevos medios.
