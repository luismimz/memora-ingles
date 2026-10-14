# Bucle de producción Memora

Objetivo activo: 1000 lemas útiles con enseñanza y repaso verificables; ampliación a 3000 cuando la cobertura lo justifique, no para atribuir un nivel CEFR.

Actualización del usuario: cognados transparentes como INFORMATION/información se enseñan directamente, sin mnemotecnia forzada, con audio y ejemplo. El primer lote de cognados contiene 12 candidatos, independientes del lote de 16 asociaciones. Ningún borrador ni phrasal del laboratorio cuenta todavía como vocabulario publicado o aprendido.

## Avance comprobado del catálogo

- Segundo lote redactado: 519 filas; el compilador conserva 476 candidatos únicos y retiene 43 casos (duplicados, falsos amigos, flexiones, correspondencias dudosas o sonido pendiente).
- Total de cognados en revisión: 488, agrupados por ámbito en paquetes explícitos de vocabulario sin gramática ni ejercicios de construcción inventados.
- Acceso: preview → Palabras → buscar por palabra o filtrar ámbito. La Home mantiene las 8 misiones anteriores; estos paquetes editoriales no inflan sus contadores.
- Pronunciación documentada: fonemas del diccionario CMU, versión 74790861f652b15e4ac49015a90074ad62a27690. Conversión fonémica amplia sujeta a revisión; licencia conservada. No equivale a audio aprobado.
- Verificación en aplicación: búsqueda INFORMATION, enseñanza directa de INFORMATION/COMMUNICATION/CONVERSATION, ejemplos y paso a recuperación después de enseñarlas, sin gramática obligatoria.
- Fusión reutilizable: TURN, GET, GO y TAKE, con 20 combinaciones y sentidos concretos, disponibles en laboratorio editorial. No publicados ni evaluados como dominio.
- Acceso local Directus revalidado: las credenciales siguen rechazadas. No se ha publicado contenido ni se ha marcado completa la expansión.

## Estado comprobado

- Catálogo histórico: 3029 filas, 2104 lemas simples distintos antes de revisar tipos y sentidos; no equivalen a asociaciones aprobadas.
- Phrasal verbs históricos: 80 expresiones; familia TURN implementada como demostración, no catálogo completo.
- Gramática aprobada visualmente: piloto Jugando. El resto necesita adaptación curricular y lingüística.
- Directus local: credenciales configuradas rechazadas en consulta de lectura. No se ha escrito ni eliminado contenido.
- Copia restaurable: `/private/tmp/memora-production.ANJb9n/before-expansion.tar.gz`, comprobado su índice.
- Remoto existente: `git@github.com:luismimz/memora-ingles.git`, rama main. Hay cambios previos del usuario; no se incorporan indiscriminadamente ni se suben secretos.

## Iteración obligatoria

1. Seleccionar por utilidad conversacional, ámbito y frecuencia contrastada. No llamar frecuentes a filas solo porque estén al principio del archivo histórico.
2. Redactar puente español real, relación sonora con diferencias explícitas, significado único y escena causal breve. El puente no sustituye al audio inglés.
3. Rechazar asociaciones débiles. Los campos completos no convierten un candidato en aprobado.
4. Revisar pronunciación, medios, confusores, uso en contexto y ejemplos. Mantener revisión textual, auditiva y visual independientes.
5. Incorporar a Palabras antes de evaluar en Arcade. No inventar gramática para dar forma a una unidad de vocabulario.
6. Adaptar ficha espejo con palabras preparadas: español natural → quién → espejo → inglés; mismos roles y colores; un truco por vez; ayudas y salida disponibles.
7. Preparar pregunta y respuesta antes del chat; conservar errores, ayuda y reintentos sin inflar dominio.
8. Verificar recarga, duplicados, SRS, historial y persistencia real. Verificar una muestra por lote y ejecutar regresión al integrar, no repetir la suite por cada palabra.
9. Revisar el diff y secretos antes del commit/push. No publicar contenido por el mero hecho de llegar a un número.

## Controles y pendientes

`productionCatalog.ts` separa lemas, categorías y chunks y conserva procedencia. El primer lote local contiene borradores editoriales, incluidos ejemplos explícitamente débiles que deben corregirse o retirarse antes de publicación. Nada de ese lote entra automáticamente en el juego.

Pendientes para completar: selección y revisión de 1000 lemas, medios y contextos, importación Directus, 36 fichas revisadas, fusión reutilizable de familias phrasal, acceso del alumno por conocimientos reales, verificación extendida y subida GitHub. Este documento no certifica finalización.
