# Ilustraciones fuera del JavaScript inicial

Séptimo incremento encadenado sobre360b631. El empaquetado incrustaba siete SVG pequeños como dataURL en el código principal. Se usa la opción no-inline soportada y tipada por la versión local de Vite: cinco escenas mnemónicas y RADIO/MUSIC ahora emiten archivos con huella. El componente img existente solicita su archivo al mostrarse; no precarga las siete historias en el script ni cambia imagen, idioma, juego, estado o aprobación.

Cambios: MnemonicScene, CognateScene y su prueba de referencia del recurso.13pruebas enfocadas/2archivos y build/TypeScript/diff; la batería funcional completa precedente535/104 sigue cerrada, no se repite por el cambio mecánico de URL. Build principal636,85→616,80kB (−20,05kB); gzip189,87→184,86kB (−5,01kB). Se generan siete SVG2,01–2,79kB. No es una medición de latencia/red/móvil ni elimina el aviso de bundle>500kB. CSSindex-BLUvf3C6.css sin cambio respecto a360b631.

Revisión de build: siete archivos SVG separados, referencias presentes en JavaScript y recursos visuales sin alteración de contenido. Tras publicación se contrastan HTML, JS/CSS y las siete huellas SVGHTTP; estado exacto y copia en checkpoint superior. Si un archivo no estuviera servido no dar por terminado el contraste solo por tener el JavaScript publicado.
