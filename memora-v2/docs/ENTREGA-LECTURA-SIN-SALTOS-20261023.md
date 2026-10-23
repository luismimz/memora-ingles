# Leer y continuar son intenciones distintas

Sobre4702082. GameCard vertical ya no navega al recibir scroll. El gesto que desplaza un texto largo hasta abajo termina de leer; para cambiar de encuentro hace falta un nuevo gesto iniciado al final, el control por toque o una nueva tecla al final. Rueda/inercia de una misma ráfaga no atraviesa el contenido ni la tarjeta siguiente. Selección, campos, piezas, controles y preguntas sin autorización no activan avance. Feedback conserva posición; cambios de layout no cuentan como intención.

Se mantienen GameCard, transición, movimiento reducido y callbacks/evidencia existentes. No nuevo almacén, motor, contenido, cuenta ni acierto por gesto. Las pruebas de episodio emplean ahora un gesto de100px iniciado explícitamente al final: antes armaban50px y un scroll artificial, lo que reproducía el defecto. No se sustituyeron recorridos por llamadas a onFinished.

39 pruebas enfocadas/7archivos,444/85 integración y build correctos; bundle540,53kB/166,89gzip conserva aviso de tamaño. Pruebas montadas cubren lectura completa táctil/rueda/End sin salto, nueva intención, inercia, selección, retirada de autorización, cancelación y movimiento reducido. No inspección física en móvil/trackpad ni valoración de diversión acreditadas. La entrega no completa cobertura del curso ni evaluación de retención.
