# Perfil y ajustes con un propósito claro

Perfil deja de ser un segundo panel de estadísticas/práctica: contiene foto, apariencia y estado de guardado. Una acción principal vuelve al recorrido. Mi evolución conserva el acceso a historial y repasos; Arcade sigue disponible en el recorrido/evolución, no como otra decisión dentro de ajustes. Sesión y herramientas de administración quedan en apartados secundarios. La condición isAdmin y fuera de preview se conserva en App; el componente no amplía permisos.

Se retiran las inferencias «El recuerdo sigue fresco» a partir de una fecha futura, «aciertos al recordar» para una mezcla de capacidades/apoyos y presión de racha en este panel. No se borra ni cambia ningún dato, scheduler, sesión o intento. El perfil ya no lee estadísticas de aprendizaje para mostrar ajustes. Se retiran sus reglas de estilo antiguas sin consumidores y se preservan los selectores compartidos de inicio/Arcade. Los estilos de ajustes usan tokens y se descargan con el perfil opcional.

La foto conserva límite de500 KB y formatos JPG/PNG/WebP y almacenamiento local. Una nueva selección cancela la anterior; salir o cambiar usuario invalida lecturas pendientes para que una respuesta tardía no guarde un avatar. Se distinguen preparación, éxito, fallo de lectura y fallo de guardado, conservando la foto previa si falla. No sube archivos a la cuenta ni borra fotos/progreso.

Verificación enfocada: retorno/evolución/apariencia, administración secundaria/ausente para alumno, revisión, estados de sincronización, límite/formato, éxito/error de foto, selecciones concurrentes y salida/cambio de usuario. App montada mantiene Perfil→Mi evolución→Inicio y no registra intentos. Integración/build final se registra en el checkpoint. No QA visual física/móvil, partida ni escucha: controles antes bloqueados no se reintentan. No afirmar diseño terminado o diversión por tests verdes.

Prueba humana: Inicio → Perfil y ajustes. Cambiar apariencia, volver al recorrido, entrar a Mi evolución; revisar estado de guardado. Foto opcional local. Cerrar sesión solo desde Sesión; administración solo aparece cuando el callback autorizado existe. La limpieza del panel no modifica permisos ni publica contenido.

## Ritmo sin reloj accesible

Ritmo de Arcade permite activar o desactivar Sin reloj antes de empezar a jugar. Reutiliza la preferencia por alumno del Arcade de palabras y gramática, en este navegador; no crea otro motor ni sincroniza el ajuste con la cuenta. Conserva identidades de misiones, contador y ronda pendiente. Los retos que ya son tranquilos siguen siéndolo y la enseñanza nunca añade un temporizador. Si el navegador rechaza el guardado, explica el fallo sin mostrar el cambio como persistido; el control dentro de Arcade sigue permitiendo elegirlo para la sesión.

Comprobaciones: preferencia existente, lectura sin escrituras, alternancia, persistencia al volver, separación de usuarios, conservación de cadencia y ausencia de progreso de aprendizaje, error de almacenamiento. Se mantienen las pruebas de palabras/gramática y del reloj que comprueban avance manual y ausencia de caducidad en modo tranquilo. Prueba humana adicional: Perfil y ajustes → Ritmo de Arcade → Activar sin reloj → volver al recorrido → abrir un Arcade disponible. No obliga a jugar ni habilita contenido pendiente.
