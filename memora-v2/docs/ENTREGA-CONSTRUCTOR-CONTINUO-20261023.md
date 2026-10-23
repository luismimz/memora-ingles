# Constructor continuo y reparación breve

Incremento sobre d9952ec. Reutiliza SentenceBuilderCard, GameCard, reducer/checkpoint, journal y exposiciones SRS existentes. No otro motor ni contenido nuevo.

La explicación de cada pieza y el cierre de una frase se recorren mediante desplazamiento vertical, con alternativa accesible de teclado/toque del marco. Las piezas siguen siendo acciones directas; deslizar mientras falta elegir nunca coloca una pieza ni escribe un intento. No se espera a que termine un audio bloqueado para continuar. La revisión de solo lectura conserva controles explícitos.

El constructor limita cada pieza a primer intento y una reparación. La ayuda explica la correspondencia del último error, persiste al recargar y conserva la cadena de intentos. Tras dos fallos se ofrece el modelo con escucha y «Colocar con ayuda». No se exige otro acierto para salir ni se convierte el modelo en una respuesta correcta. El resumen de una frase que usó modelo es authored/neutral, no un acierto del alumno; las respuestas reales de otras piezas siguen registradas por separado.

Metadatos aditivos buildRepair/buildModelUsed en el checkpoint existente conservan posición, error y consulta. El journal sigue siendo la evidencia: checkpoint legacy sin contador recupera hasta dos errores consecutivos de esa pieza, unidad/versión/respuesta exactas, sin duplicarlos al montar. Un acierto/modelo/resumen previo corta esa recuperación. Guardias síncronas limitan ráfagas y no permiten reutilizar el callback de un modelo de una pieza anterior.

Para revisar: en una misión con constructor preparado, desplazar entre las explicaciones; elegir piezas. Probar un error, salir/volver: debe seguir la pista y las piezas ya puestas. Un segundo error ofrece modelo y continuación. Montar con él y desplazar al siguiente mensaje. Mi evolución conserva ambos errores y la consulta neutral. No se reinician usuarios, misiones o vocabulario.

Verificación automática: recorrido montado real con ráfaga de quince pulsaciones (solo dos intentos), reload de pista/modelo, doble colocación y callback antiguo, resumen neutral, corrección real, preparación de una pieza por gesto y continuación a otra frase. Tests de checkpoint/reducer y batería/build registrados en checkpoint de entrega. No partida física/móvil, inspección visual o audio escuchado acreditados. El flujo Inicio→parada→constructor/conversación global y el curso/cobertura siguen pendientes; esta entrega mejora el constructor existente, no afirma completar la aventura.
