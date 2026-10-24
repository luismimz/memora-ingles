# Palabra → escena: interacción compartida

Prioridad humana 24/10: mejora global intuitiva, dinámica y divertida. Este incremento reestructura el reconocimiento de las tandas nuevas de vocabulario; no declara terminada la mejora global ni valida diversión por tests.

## Investigación aplicada, no promesa

- [Metaanálisis y revisión sistemática, Educational Technology Research and Development](https://link.springer.com/article/10.1007/s11423-023-10337-7): 35 intervenciones, 2500 participantes; efecto pequeño sobre motivación intrínseca y resultados heterogéneos. Reglas poco claras, reto inadecuado y comparaciones públicas pueden frustrar. Implicación de diseño: acción comprensible, dificultad acotada y control del ritmo; no llenar la pantalla de puntos o rankings.
- [Estudio de aprendizaje de inglés, Humanities and Social Sciences Communications](https://www.nature.com/articles/s41599-024-04073-3): 70 participantes durante dos semanas; mejoras declaradas de disfrute no prueban retención ni que este diseño de Memora funcione. La valoración del alumno sigue pendiente.

## Implementado

Primero se enseñan las palabras de la tanda. Después se lleva una palabra inglesa a una de dos escenas conocidas, o se toca/activa la escena con teclado. Etiquetas españolas y audio consultable: es reconocimiento con ayudas. El resultado explica la conexión y espera al alumno, sin temporizador de lectura ni XP como explicación principal. Error finito → modelo, conserva primer intento y elección al recargar. Salir, desplazar, cancelar o soltar fuera no responde.

Se reutiliza el gesto de GrammarSituation mediante SceneDelivery: misma colocación estable, captura de puntero, equivalencia toque/teclado y contenedor local. No nuevo motor de memoria ni scheduler. Registro conserva reconocimiento ayudado y añade identidad word-scene-v1 para distinguir la nueva dirección de consigna. Sesiones antiguas mantienen su presentación incluso si seguían en enseñanza. ActiveRecall sin pistas permanece intacto. Sin dos significados distintos se conserva la tarea anterior; no se inventan distractores.

## Verificación y límites

21 pruebas enfocadas; integración 494/94 archivos; TypeScript/build/diff correctos. Cinco casos nuevos cubren enseñanza previa, desplazamiento neutral, acierto/error retenidos y reanudados, elección estable, intento único ayudado, legacy desde asociación y unidad sin distractor. Pruebas de arrastre compartidas existentes conservadas. Bundle principal 587,22 kB; aviso de tamaño pendiente.

No app/móvil jugados ni audio escuchado en este turno. Controles de inspección bloqueados previamente no reintentados ni eludidos. No nuevas palabras, medios o cobertura aprobados. No progreso real/cuentas/Directus/sources/piloto/Claude modificados. La investigación orienta el diseño; no acredita disfrute ni memoria diferida.

## Para revisar

Inicio → Practicar algo concreto → Aprender palabras → una tanda nueva con al menos dos significados distintos → terminar enseñanza → «¿A qué escena va?». Arrastrar o tocar, observar resultado, salir/reanudar y continuar manualmente. Una tanda ya empezada sigue su actividad anterior; no borrar progreso para ver la novedad. La misión de llaves con recuerdo independiente conserva escritura sin pistas.

Entrega: commit/push y versión HTTP se registran en el checkpoint superior del proyecto. Siguiente incremento global: orientación del tramo actual y siguiente acción en la superficie compartida, sin menú nuevo ni acreditaciones por navegación. COOK/DINNER/KITCHEN queda posterior a esta prioridad humana, no descartado.
