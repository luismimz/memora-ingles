# Revisión del 12 de octubre de 2026

## Consolidación implementada

Memoria: calendarios independientes por capacidad; evidencia explícita de aciertos
sin ayuda y recuperación tras al menos un día; las pistas no certifican dominio;
historial anterior sin esos datos se conserva, pero no se interpreta como dominio.
Arcade consulta capacidad débil, devuelve palabras consolidadas en mantenimiento
vencido, usa solo el catálogo recibido y retira imágenes al madurar. La escritura
carece de cuenta atrás; una pista llega después de ocho segundos en completado.
Las opciones son distintas y cambian de posición. Los fallos vuelven a la escena
y tienen cinco segundos de lectura. La fatiga real puede retirar el límite de
tiempo durante la sesión; una propiedad ausente ya no cuenta como pista.

Se retira Feynman libre de la evaluación automática. La conversación usa preguntas
cotidianas y una lista revisada de respuestas aceptables; admite contracciones y
su expansión. Los ejemplos de prueba incluyen preguntas de lo que haces/cocinas.

Gramática de presente continuo: narración española sincronizada con piezas y
audio inglés, señal ANDO/IENDO → ING, ESTOY → I AM e I AM → I'M; dos retos breves
sin cuenta atrás y con ayuda tras fallar. La demostración se oculta durante el
reto. Las formas de otros contratos pendientes no se sustituyen por marcadores.

Accesibilidad: foco visible, tamaños mínimos de botones, movimiento reducido,
lectores de pantalla sin spoilers en Recordar; flechas dentro de campos o controles
no avanzan la tarjeta. Se resaltan todos los términos editoriales, incluidos LAVA.

Publicación: registro vigente y evidencia de audio/imagen requerida; los medios
pendientes permiten probar borradores, pero no publicar como contenido terminado.
Los preparadores de specs genéricas e imágenes directas están desactivados.
Los modos alternativos permanecen solo para lectura de datos históricos.

Kokoro local no está configurado: la narración usa voz del dispositivo. El proveedor
ya no sustituye una voz española fallida por una inglesa ni reutiliza esa caché.
No se ha instalado ni conectado un servicio nuevo de voz en esta entrega.

Persisten pendientes: catálogo de 300 palabras, ilustraciones de escenas completas,
contratos jugables de otros tiempos, evaluación libre semántica y pronunciación,
sincronización entre dispositivos y estudio de recuperación con alumnos reales.

Ideas conservadas: memoria por capacidades (significado, escritura, escucha y
pronunciación), registro de errores, cola para revisar asociaciones, sustitución
versionada con reinicio del calendario y ampliación curricular como candidatos.
La ampliación no equivale a contenido ejecutable ni a vocabulario aprendido.

Correcciones: el final de una prueba permanece visible hasta continuar; los
saltos con selector invalidan la evidencia de recorrido completo; equivocarse
no impide finalizar una prueba editorial; sustituir un candidato invalida la
prueba anterior; se conserva el modo revisor al pasar a otra unidad; el taller
busca el verbo de la forma gramatical y no presupone que sea la primera palabra.
El revisor de desarrollo muestra un selector y no guarda progreso del alumno.

El protocolo vigente requiere puente acústico español real. Las rutas directas
añadidas por Copilot siguen siendo legibles para datos históricos, pero no pasan
la aprobación del registro ni la instalación de asociaciones nuevas.

Ejemplos: m1-test-desk y m1-test-kitchen, guardados como borradores en Directus y
incluidos localmente en review-examples.json. No se publican automáticamente.
Sus representaciones siguen usando emojis provisionales; no son ilustraciones
de escenas completas. Sus puentes son aproximaciones documentadas, no IPA.

Verificación: compilación de producción; pruebas dirigidas de memoria, unidad
y máquina de estados; comprobación visual en localhost:5174 de Inicio, asociación
y acceso al taller con selector. Esto no equivale a probar en vivo todas las
funcionalidades nuevas, permisos de micrófono o retención a largo plazo.

Pendiente: las specs nuevas con "forma funcional", personas que solo contienen
pronombres, frases duplicadas y respuesta genérica son borradores curriculares;
necesitan revisión y un contrato visual adecuado antes de ser jugables. No
ejecutar la ampliación como si ya estuviese terminada.
