# Conversación con ayudas compactas y rescate finito

Incremento sobre cdb532f. No contenido ni preguntas nuevos; conserva preparación, IDs de turno, borradores, interlocutor y journal/SRS existentes.

En el chat se muestra la respuesta principal y una entrada secundaria para ayudas/alternativa oral. Abrir el desplegable no marca ayuda; pedir pista/modelo sí. Se conservan pista escrita, audio, Eco opcional y ver respuesta/pasar. Solicitar audio ya no se registra como haberlo escuchado.

Cada turno permite primer intento y una reparación guiada; tras dos fallos conserva el borrador/historia y ofrece modelo para seguir, sin exigir copiarlo ni registrar acierto. El contador aditivo vive en el checkpoint existente. Un checkpoint legacy recupera errores de la cadena real por unidad/versión/turno, sin contar una pregunta retirada como otra. Límite síncrono para ráfagas, ayuda+envío inmediato fiel y continuación única aunque coincidan dos acciones. La respuesta del personaje queda vinculada al evento neutral de consulta cuando se pasó con modelo.

Prueba de revisión: en una conversación preparada, escribir dos respuestas incorrectas. Debe desaparecer el formulario repetitivo y aparecer «Ver el modelo y seguir». Salir/volver conserva ese punto; modelo y continuación no son aciertos. La siguiente situación permite responder normalmente. También probar pista+respuesta y consultar audio sin convertirlo en nota oral. Los controles secundarios están en «¿Necesitas ayuda u otra forma de responder?».

Pruebas montadas con componentes reales y movimiento reducido cubren rescate, ráfagas, legacy/reload, cadena de errores, modelo neutral, doble continuación, ayuda+envío y solicitud de audio bloqueado. Integración/build registrados en checkpoint de entrega. Pendientes revisión visual/móvil, partida humana, audio escuchado y evaluación de diversión/retención; no se acredita conversación espontánea ni cobertura1050. El feed no desliza una conversación mientras se escribe; conservar esa protección.
