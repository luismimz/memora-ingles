# RADIO y MUSIC: escenas de significado

Entrega parcial sobre main 4dcc0bc. Responde a la petición de hacer comprensible y visual la experiencia, no declara terminado el juego o el curso.

## Cambio observable

Las tarjetas existentes de RADIO (radio/aparato de radio) y MUSIC (música) muestran ilustraciones SVG originales de significado: aparato con antena/altavoz frente a personas haciendo música. Sustituyen el fallback genérico solo cuando la palabra es cognado, declara el mismo significado, no tiene imagen propia ni puente sonoro y coincide con estos sentidos. HOTEL/INFORMATION mantienen sus escenas anteriores.

Se reutiliza SceneVisual tanto al enseñar como en la recuperación existente. Las imágenes no contienen texto inglés visible; al retirar la respuesta se conserva la etiqueta accesible genérica. El audio y su aviso de reproducción bloqueada siguen disponibles. No hay nuevos controles ni pasos, temporizadores, almacenes, intentos, SRS o cambios en el progreso.

## Verificación y límites

- Inspección de las dos ilustraciones renderizadas a 840×600 y 210×150; no es inspección de la aplicación en móvil ni partida física.
- Pruebas enfocadas: tarjetas con datos existentes, selección de recurso real (Vite puede incorporarlo como data URL), audio bloqueado, ocultación del apoyo escrito, no mutación del catálogo, imagen propia, otro sentido y puente acústico conservados; continuidad vertical existente.
- Integración/build y huellas se registran en el checkpoint de entrega. No equivalen a diversión o memoria demostradas.
- No se cambia ningún estado editorial, IPA, ID o versión del catálogo. No se importa el candidato local de 35 palabras, no se aprueban audios no escuchados ni ejemplos ingleses nuevos.
- El recurso visual es código nativo propio revisado, no un sustituto de medios externos denegados. No se reintentaron controles bloqueados.

## Recorrido de revisión

Inicio → mapa de vocabulario → Cognados · ocio · 3 (RADIO) o Cognados · general · 4 (MUSIC) → tarjeta de la palabra, cuando el catálogo recibido ofrece esos grupos. Mantener el progreso; no reiniciar cuenta para verla. La ruta de repaso existente reutiliza la escena cuando esa palabra resulta elegible. La entrega no fuerza una palabra futura ni altera el orden de preparación del alumno.

Comprobar si la escena ayuda a distinguir el objeto del sonido, si el audio responde y si continuar/volver conserva la posición. Escucha, partida física, aceptación humana y recuerdo diferido siguen pendientes.

Resultado: 474 pruebas/90 archivos correctos; después de corregir únicamente un fixture de evidencia ausente (el tipo solo admite sameMeaning=true), siete pruebas enfocadas y build TypeScript/Vite correctos. JS index-BHBvN9Ps.js SHA256 b80a2d42155ba4f7a49f1bd57e9ba0927065d7c1c5fbe14aa50dd54f9ba6d1d6; CSS index-vjBFZZ8E.css SHA256 74fd75795a322c5b38c8702659702de7cd70650acd5b6054cc5cdbb074f9157b. Aviso de bundle564,68kB/173,86gzip conservado. El push y el contraste público son estados separados registrados en checkpoint.
