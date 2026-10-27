# Acciones docentes y orientación dentro de la actividad

## Referencia humana y escenario continuo · 27/10/2026

Diez capturas aportadas por el usuario de mem-ora son la referencia visual concreta de esta revisión: vocabulario/historia juntos, un escenario reconocible entre enseñanza y juego, bloques claros, controles grandes y resultado en el mismo lugar. No son aprobación de Memora ni autorización para editar/publicar/copiar el otro proyecto.

Sustituida la superficie plana con tarjetas/formularios aislados por un escenario atmosférico compartido de práctica, con paletas propias clara y oscura, tono por actividad y capas transparentes. Mismo soporte para palabra, recuerdo, gramática, montaje, conversación y Arcade. Los estados correct/retry/model conservan significado, texto y color; borde de resultado alrededor de la misma superficie, sin fabricar XP/rachas o cambiar las reglas de ayuda. Gesto/teclado/lectura, pausa y salida no se sustituyen por animaciones.

PlayHeader muestra la posición ya calculada en una barra identificada como posición, no dominio. Los tres pasos de vocabulario pasan a opciones, sin desaparecer su acceso ni causar un salto de altura al entrar en gramática. La salida y los avisos de guardado siguen visibles. El avance usa la misma franja y mantiene espacio cuando la tarea aún no está lista.

La asociación estándar presenta imagen → palabra/significado → historia causal. Se elimina la repetición de la cadena escrita sobre la imagen principal, no su ayuda. Un ejemplo autoral traducido, cuando existe, aparece en una tarjeta común para asociación y cognado con audio por el componente existente: no se inventan ejemplos, historias o requisitos. No se copian NECK/GET ni las reglas universales de las capturas al catálogo. GrammarCoach da título al truco existente y en el recordatorio usa nivel de encabezado subordinado para conservar foco y semántica.

Comprobación: integración920/154, regresión de recorrido81/81 y después79/79 tras ajustar jerarquía de encabezados y posición de episodio; build TypeScript/Vite correcto. Contraste de texto/apoyo/acción/estados en extremos de fondos de ambas apariencias y respeto por movimiento reducido comprobados automáticamente. Retirado el CSS sin referencias del ejemplo desplegable anterior. No inspección visual nueva, partida móvil, audio escuchado, diversión, eficacia o aceptación humana acreditadas. Controles UI/catálogo bloqueados no reintentados ni eludidos. No se declara igualado o superado el referente por cambiar estilos.

Base recuperada limpia desde main8f359be en /private/tmp/memora-design-jASUnR/repo/memora-v2: la copia temporal anterior conservaba componentes, pero faltaban HEAD/config de Git, package.json/lock y tsconfig. Queda intacta, incluidas dos pruebas Echo ajenas que no se copiaron ni publicaron. Instalación desde lock con scripts ignorados. Auditoría prod:0 avisos; herramientas de desarrollo:5 heredados (incluidos críticos), pendientes de actualización compatible separada, sin audit fix --force. Docker sirve dist en Nginx, no el servidor de desarrollo. Chunk inicial639,77kB mantiene aviso >500kB.

Para revisar: recargar sin borrar datos → Continuar. El escenario y cabecera cambian ya en la tarea guardada; no es necesario empezar de cero. Ver asociación con historia/ejemplo disponible, responder una recuperación y montar/usar una frase preparada. La prueba humana debe valorar conjunto y continuidad, no solo una captura o número de tests. Versión enviada/realmente servida en el único checkpoint del proyecto.

## Revisión jugable · 26/10/2026

La petición humana vuelve a priorizar el método jugado, no otra capa de portada. Cambios sobre los componentes existentes:

- Montaje de frases: tablero español→inglés adaptable, sin carril lateral. Tocar sigue funcionando y el arrastre Pointer Events también admite móvil: pieza bajo el dedo, destino activo visible, soltar fuera/cancelar no responde y el click posterior no duplica el intento. La frase final se presenta unida. Se conservan preparación, error acotado, modelo ámbar, ayuda, checkpoint y callbacks de progreso.
- Demostración gramatical vertical: las piezas inglesas con papel explícito compartido en las filas preparadas se pueden tocar. Destacan las piezas de ese papel en ambos idiomas y muestran su conexión; se escucha el mensaje completo, nunca ING aislado ni una regla universal de traducción palabra por palabra. No se generan intentos por explorar el modelo.
- Contracción I + AM: gesto horizontal reversible, con movimiento y alternativa de toque/teclado. Un gesto corto, vertical, cancelado o secundario no transforma. Se conserva la exploración authored/correct:null existente, no se premia como comprensión ni recuerdo autónomo.
- Arcade: la nueva petición explícita de cuenta atrás sustituye la desactivación automática anterior. Diez segundos solo para elecciones individuales preparadas; nunca para contenido nuevo/modelo pendiente, parejas, escritura, inspección, ayuda solicitada o espera/reproducción de audio. La escucha empieza a consumir tiempo al terminar la reproducción, no al pedirla. Las escenas gramaticales siguen sin reloj. Se reutilizan useArcadeClock y la preferencia tranquila persistente, accesible también en sorpresa automática. Pausa y resultado estable antes del gesto; caducar registra omisión neutral, no error ni acierto, y deja el modelo disponible.

Retirados el drop HTML de escritorio y el carril horizontal/completado por fragmentos sustituidos. Sin nuevo scheduler, store, publicaciones editoriales, migración ni reinicio de progreso. No se han revisado globalmente las asociaciones ni reparado físicamente Kokoro. No se ha inspeccionado ni jugado en móvil; siguen cerradas las puertas de control/UI y catálogo autenticado. Verificación técnica, no aprobación de diseño, diversión ni eficacia.

Segunda mejora funcional encadenada: una escena nueva con estructura/diálogo y TODAS sus palabras ya practicadas con éxito en el mismo sentido, versión de asociación, historia y puente entra directamente a recuperar antes de la gramática. No vuelve a mostrar/copiar cada palabra por sistema. Se reutiliza la memoria existente, sin otro registro ni puntuación; la recuperación sigue sin responder, con ayuda disponible. Reconocimiento previo no se considera dominio: solo permite reutilizar la enseñanza y comprobar de nuevo. Si falta una palabra, solo se vio un modelo, cambió su sentido/asociación o hay un checkpoint empezado, se conserva el recorrido correspondiente. La biblioteca explícita de vocabulario no se altera. No se salta comprensión, gramática, montaje ni conversación.

Recorrido de revisión: abrir la escena preparada → explicación de las piezas → tocar una pieza inglesa; cuando se presente I + AM, unir hacia la izquierda y separar hacia la derecha → montar arrastrando al hueco → ver el mensaje entero → usarlo en conversación. En la sorpresa Arcade elegible, completar parejas sin reloj; la elección auditiva muestra diez segundos solo después de oírla. Opciones → Sin reloj conserva esa elección entre sesiones. Los pasos ya conocidos no se reinician para forzar una demostración nueva.

La verificación y la versión enviada/servida se registran en el único checkpoint MEMORA-IMPLEMENTACION-01.md; este documento no acredita publicación ni un curso terminado.

## Entrega anterior

El modo vertical de GrammarCoach ignoraba los advanceLabel revisados de cada paso y mostraba siempre «Continúa la explicación». Ahora conserva preguntas y acciones preparadas, como «¿Quién está jugando?» y «Ver cómo encajan las piezas». Cuando no hay etiqueta editorial, distingue siguiente pieza y entrada a práctica.

Una línea indica preparación/paso o práctica/reto. Es ubicación dentro de la actividad, no porcentaje de dominio; al reanudar refleja el paso real sin reiniciar ni marcar intentos. No se modifican contenido, checkpoints, ayudas, corrección, SRS ni salidas. Los recorridos no verticales conservan su comportamiento.

Verificación: 26 pruebas enfocadas; integración 572 pruebas/112 archivos; TypeScript, Vite y git diff --check correctos. Dos casos nuevos comprueban las tres acciones preparadas, transición al montaje sin saltarlo, ausencia de intentos al navegar, etiqueta alternativa y posición inicial reutilizada. Persiste el aviso de chunk inicial mayor de 500 kB. Sin inspección visual, partida ni audio escuchado: controles previamente bloqueados no reintentados. Diversión, retención y aprobación del usuario pendientes.

Prueba humana: Inicio → Continuar → encuentro gramatical preparado. La preparación indica su posición; el botón formula la acción prevista por el contenido, no una continuación genérica. Tras la última pieza se muestra la práctica y no permite continuar el reto sin responder o recibir el modelo acotado existente. Los pasos omitidos por estructura ya preparada no se presentan como completados nuevos.

## Continuidad en el constructor

SentenceBuilderCard vertical también anunciaba usar la pieza aunque aún faltaran pasos. Ahora comparte etiquetas con el modo clásico: siguiente pieza, usar piezas, siguiente frase o usar mi frase según la transición real. GameCard elimina la flecha editorial final antes de añadir su propio icono, evitando dos flechas y nombres accesibles redundantes. No cambia callbacks, tiempos, evidencia ni requisitos.

Dos pruebas nuevas comprueban preparación controlada sin intentos, bloqueo hasta montar, distinción entre frase intermedia/final y una sola flecha visual. Las pruebas de recorrido real actualizan la etiqueta esperada y comprueban un único control final en la franja, no un duplicado dentro de la conversación. Fallos iniciales detectaron expectativas antiguas del texto de los botones; corregidas manteniendo las comprobaciones de continuidad y ausencia de intentos ficticios. Build TypeScript/Vite correcto; integración final registrada en el checkpoint. Sin QA visual o diversión acreditadas.
