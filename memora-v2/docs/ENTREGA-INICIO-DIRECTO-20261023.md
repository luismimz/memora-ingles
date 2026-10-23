# Inicio directo: jugar antes de explorar el mapa

Incremento sobre3c25f5b. Cambio de flujo, no otro scheduler: la misma selección preparada y posición guardada alimentan la acción principal.

Antes, el mapa estaba antes de la tarjeta de entrada y en móvil su contenedor reservaba casi una pantalla completa; había que desplazarse antes de llegar al botón de la aventura. Ahora Inicio muestra primero la acción «Continuar jugando» con el encuentro pendiente y una instrucción breve. En móvil el texto/acción aparecen antes de la ilustración. Cuando solo hay práctica completada se etiqueta «Volver a practicar», no como novedad.

El mapa permanece en «Ver mi recorrido · elegir otra parada», secundario y accesible. Solo se monta al abrirlo para medir/centrar correctamente la posición cuando tiene tamaño visible. Cerrar/abrir no toca progreso ni cambia el destino de Continuar. La práctica específica sigue disponible en un desplegable, con accesos a palabras/Arcade/gramática y conversación preparada. Se retira la invitación adicional de Arcade de Inicio: el retorno automático del recorrido no depende de esa invitación ni de buscar menús.

No se ocultan salida, perfil, Mi evolución ni posiciones independientes. No cambia qué contenido está preparado o completado, no se exige repetir una misión anterior y no se añade cuenta diaria o tope de35.

Para revisar: iniciar sesión → Inicio debe mostrar la tarjeta de continuación antes del mapa. Continuar abre la parada guardada. Salir/volver debe mantenerla; abrir el mapa muestra esa misma posición y permite explorar otra. En móvil comprobar CTA antes de ilustración y mapa cerrado sin reservar toda la altura. Probar teclado: Tab/Enter en resumen y accesos a mapa/práctica, sin gestos obligatorios.

Pruebas reales de componente y SSR cubren orden, mapa cerrado/carga bajo apertura, parada11 con anteriores pendientes, checkpoint en curso, completado de truco y ausencia de escrituras al explorar/cerrar/continuar. Integración/build en checkpoint. No inspección visual/móvil ni diversión humana acreditadas: este cambio necesita revisión del usuario publicado. Curso/cobertura y escenas adicionales siguen pendientes.
