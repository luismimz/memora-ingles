# Chat y presentación gramatical · 12 de octubre de 2026

Corrección acotada a presentación e interacción. No reescribe las explicaciones,
historias o palabras que el usuario está revisando.

- Se corrigió la salida de GameCard: una tarjeta que cambia de contenido sin
  desmontarse vuelve a su posición inicial. El chat no depende de deslizarla.
- Gramática: filas centradas y etiquetadas Español/Inglés; ESTOY e I AM/I'M usan
  el mismo color. Las raíces, terminaciones y elementos de la explicación tienen
  roles explícitos. FOR ya no se agrupa visualmente dentro del sufijo ING.
- Pausa: etiquetas Pausar explicación / Reanudar explicación, sin el carácter
  ambiguo que parecía «Il».
- Emma muestra un indicador de escritura y revela su mensaje por letras; el
  audio modelo comienza al revelarlo y puede repetirse con el altavoz.
- El alumno escribe y envía dentro del mismo chat. El error y la corrección
  permanecen como mensajes; el texto del editor no se borra al fallar.
- Se conserva el vínculo al intento anterior y la distinción de ayudas.
- El cambio de papel y la transferencia continúan en el mismo chat. La voz es
  opcional y no se presenta como una pronunciación evaluada.
- Se elimina solo la escritura repetida antes del chat cuando sus respuestas
  coinciden con las que se practicarán allí. No se omiten otros objetivos.
- Menor movimiento muestra el mensaje completo, sin efecto de letras.

## Comprobaciones

Recorrido en la aplicación real, modo revisión, sin añadir respuestas ficticias
a la cuenta del usuario: pregunta entrante, error sin AM, corrección, reintento,
pregunta del alumno, respuesta de Emma, transferencia a PHONE y llegada al final
con progreso del 100 %. Se comprobó también Pausar/Reanudar y el centrado.

Las piezas de presentación del borrador en Directus se actualizaron mediante un
ajuste específico que conserva palabras, frases y explicaciones, rechaza contenido
publicado y aborta si el registro cambia durante la comprobación. No hubo semillas,
migraciones, generación de pago, cuentas temporales nuevas ni publicación.

La compilación V2 y las pruebas locales cubren también el contrato del evento
escrito del chat, equivalencia de colores, conservación exacta del texto y que no
se interprete ER de COMPUTER como una terminación verbal. Esto no sustituye una
evaluación con alumnos ni convierte las respuestas revisadas en un tutor libre.

Resultado final: compilación correcta y 96 pruebas locales aprobadas. El recorrido
del chat se repitió hasta llegar al cierre sin saltarlo con el selector de revisión.

Copia previa privada y verificada: backend/private/checkpoints/chat-ui-D3v1kV.
