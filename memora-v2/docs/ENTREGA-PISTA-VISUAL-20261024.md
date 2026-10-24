# Recuperar la escena cuando hace falta una pista

Incremento sobre 9794f34. En ActiveRecallCard, pedir la historia o recibir el primer rescate tras un error muestra ahora también la escena aprendida, no solo su texto. La primera oportunidad de recordar sigue sin imagen ni modelo; pedir audio no revela además una imagen no solicitada.

Se reutilizan el nivel de ayuda/checkpoint y SceneVisual existentes, sin nuevo estado persistente o evaluador. La imagen no muestra la cadena inglesa de respuesta. La pista vuelve al reanudar; no escribe otro intento, no borra el error inicial y un acierto posterior conserva helped=true. El rescate sigue acotado a una reparación y modelo, con omisión neutral.

La instrucción distingue recordar sin apoyo, recuperar con pista y comparar el resultado con modelo/escena: ya no afirma que no hay imagen mientras la muestra. No controles nuevos, contenido editorial activado ni modificaciones del SRS.

Prueba: Inicio → Continuar → recuerdo de una palabra ya presentada → ¿Necesitas ayuda? → Recordar la historia. Ver escena sin cadena escrita de respuesta; salir y volver conserva pista y borrador. Acertar después no es recuerdo independiente. La primera respuesta sin ayuda sigue sin imagen; el audio bloqueado no revela una escena adicional ni bloquea continuar.

Evidencia: pruebas React montadas de ayuda/reload/error/neutralidad, continuidad vertical y batería/build de integración registrados en checkpoint. No partida física, móvil, audio escuchado, diversión humana ni recuerdo diferido acreditados.
