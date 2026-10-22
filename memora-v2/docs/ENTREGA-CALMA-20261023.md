# Arcade a tu ritmo

Incremento sobre 03963d0, sin catálogo ni medios nuevos.

Asociaciones y Gramática ofrecen «Sin reloj». La preferencia se conserva por alumno dentro del checkpoint de cadencia existente, sin otro almacén de aprendizaje. No consume rondas ni toca intentos o memoria. Al activarla se retira la cuenta atrás y el feedback permanece hasta pulsar «Seguir». Pausa y salida siguen disponibles; una doble pulsación no avanza dos retos. Al desactivarla se retoma el comportamiento temporizado existente.

Se reutilizan el reloj común, selección y límite de ronda existentes. No se añaden tareas para llenar cuotas, ni se registra acierto por elegir modo tranquilo. Un recordatorio con ayuda continúa siendo ayudado; sin reloj no equivale a dominio. La preferencia es local al navegador/perfil y no se presenta como sincronización entre dispositivos.

Verificación: reloj React montado con tiempo simulado (20 s sin expiración; feedback sin autoavance; avance manual una vez, siguiente reto, pausa y vuelta al temporizador). Controles y preferencia compartida comprobados en ambos componentes con estado aislado. Persistencia conserva identidades/pending de cadencia y no fabrica journal/memoria. Integración 357 pruebas/73 archivos y build correctos; un error de tipos exclusivo del test se corrigió antes de integrar. No partida de móvil ni audio escuchado, inspección visual o validación de diversión.

Para revisar: abrir Arcade desde su acceso habitual o una sorpresa; pulsar «Sin reloj», responder y leer el resultado sin que desaparezca. Pulsar «Seguir» para el siguiente reto o retorno. Salir, volver y comprobar la preferencia. No hace falta reiniciar progreso ni fallar a propósito. La sorpresa sigue limitada a los retos disponibles, hasta tres.

El curso completo, los nuevos episodios contextuales, medios pendientes y retención diferida siguen fuera de esta entrega. El aviso de bundle superior a 500 kB permanece. Commit, despliegue y versión servida se contrastan por separado en el checkpoint del proyecto.
