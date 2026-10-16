# Gramática en el recorrido

## Navegación y mapa de Gramática

Inicio es el mapa principal de palabras. El menú principal muestra Inicio, Gramática, Arcade y Mi evolución, sin el enlace redundante Palabras; el acceso secundario al repaso de vocabulario se conserva.

Gramática utiliza el mismo mapa arrastrable y sus controles de teclado, no la antigua cuadrícula de tarjetas. Sus nodos reutilizan los IDs, los checkpoints y los completados de las paradas Truco de Inicio. Las lecciones antiguas sin ese contrato siguen abriéndose en su motor existente. No se inventan fichas al construir el mapa.

El mapa de Gramática conserva una posición local independiente: practicar allí no sobrescribe la posición del mapa de palabras. La continuación recorre solo fichas preparadas y pendientes; cuando no quedan, vuelve al mapa de Gramática. Si falta vocabulario, se indica y se ofrece volver a Inicio. La posición fina continúa siendo local al navegador, mientras los intentos se sincronizan con el journal existente.

Verificados menú y ambos mapas a 320, 390, 430 y 1280 px sin desbordamiento horizontal; el mapa permanece visible incluso con el aviso de vocabulario pendiente. Las páginas temporales de comprobación se retiraron antes del build.

## Alcance

- Las misiones de palabras y el Arcade conservan sus motores.
- El mapa y la continuación usan la misma ruta: una parada «Truco» tras aproximadamente cuatro misiones, si existe una lección publicada cuyas palabras ya aparezcan antes en el catálogo.
- No se genera contenido para rellenar huecos. Las lecciones sin vocabulario previo se posponen.
- El alumno necesita al menos una práctica correcta de cada palabra requerida. Mostrar una palabra o completar una misión no inventa ese acierto.
- Si una parada aún no está preparada, se indica en el mapa y la continuación sigue con palabras. Se vuelve a ofrecer cuando está preparada; al terminar no se repiten las misiones ya completadas.
- Una parada contiene una sola lección existente. Los patrones repetidos con el mismo identificador se deduplican.
- Las misiones completas antiguas siguen conservando su gramática incorporada.

## Guardado

Los intentos gramaticales, la sesión y el cierre del truco se vinculan al ID real de la unidad origen y al journal existente. No se crean learning_units sintéticas, ni se marca completada la misión de vocabulario. La restauración de eventos conserva el cierre y no lo duplica. Las frases escritas correctamente que tienen pareja española explícita en la lección entran en el SRS como exposición, no dominio.

El paso y borrador exactos se guardan en el navegador por usuario, parada y versión. Como los checkpoints de juego anteriores, esta posición fina es local; no se promete sincronización de cada pulsación entre dispositivos. El modo de revisión nunca escribe progreso.

## Biblioteca

Carga con un máximo de seis solicitudes simultáneas y resultados parciales. Una publicación dañada no bloquea el resto. Los paquetes de palabras no se descargan al abrir Gramática. Hay aviso y reintento para cargas fallidas, filtro seguro para unidades sin formas, búsqueda por truco y palabras, y lecciones preparadas primero.

## Verificación

- Pruebas de ruta, deduplicación, desbloqueo, devolución de trucos pospuestos y continuidad desde App.
- Pruebas de checkpoints, cierre idempotente, restauración del journal y revisión sin escrituras.
- Interacciones del componente real: «Estoy jugando» → «¿quién?» → persona explícita; «ya lo entiendo» pasa al reto, no al completado; comprensión y escritura antes del cierre; SRS con la frase realmente practicada.
- Tamaños inspeccionados en navegador: 320, 390, 430 y 1280 px sin desbordamiento horizontal en ficha, revelación, mapa y biblioteca.
- No se crean cuentas ni intentos de alumno en producción para probar.
- El control de clics del navegador no cambió de estado durante la prueba; la secuencia funcional se verificó con callbacks reales de React en tests, no se presenta como una partida manual completa en iPhone.
