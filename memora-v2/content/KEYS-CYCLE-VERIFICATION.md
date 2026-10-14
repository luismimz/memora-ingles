# Has perdido las llaves · verificación local

Fecha: 12 de octubre de 2026. Entregable funcional, no lanzamiento de producción.

## Para probarlo

1. Abrir http://localhost:5174/ sin `?preview=1`.
2. Acceder con la cuenta administradora local.
3. Abrir «Has perdido las llaves» desde Inicio. Este piloto registra actividad real;
   la inspección de otros borradores conserva su modo sin progreso.
4. Completar el recorrido, escribiendo y usando las ayudas si hacen falta.
5. Consultar Mi evolución, recargar y volver a abrirlo. El indicador debe decir
   «Progreso guardado en tu cuenta», no solo guardado en este dispositivo.

El piloto se lee a través de un endpoint que respeta los permisos de Directus.
No se abre acceso general a borradores ni se publica sin revisión.

## Resultados de la prueba realizada

- Recorrido real completado con asociación, gramática, construcción y conversación.
- Error escrito conservado: `I looking for my keys`.
- Corrección conservada: falta AM; I AM se contrae en I'M.
- Nuevo intento vinculado: `I'm looking for my keys.`; marcado con ayuda.
- Cambio de papel registrado: `What are you looking for?`.
- Transferencia escrita registrada: `I'm looking for my phone.`.
- Pregunta y transferencia incluidas en las memorias de frase de Directus.
- Recarga y cierre/reapertura comprobados con el historial consultable fuera del juego.
- Escritura de PHONE en Arcade y recuperación de ese intento desde Mi evolución.
- 30 actividades reales guardadas en las cuentas temporales durante la comprobación.
- Reenvíos simultáneos sin duplicados; segunda cuenta aislada incluso ante una
  consulta que intenta indicar la cuenta ajena.
- Compilación de producción V2 y 87 pruebas locales aprobadas.
- Las cuentas y sus recursos temporales se eliminaron después de verificar resultados.

Los intervalos SRS se prueban sin modificar fechas reales. Esto no demuestra aún
retención con estudiantes ni generalización fuera de las respuestas revisadas.
La práctica oral es opcional y no recibe evaluación automática.

## Restauración y configuración

Se comprobó la extracción de la copia de código anterior a la entrega. La copia
final conserva fuentes y una copia SQLite consistente con verificación de integridad.
Las copias son privadas, están excluidas de Git y no se suben a ningún servicio.
No se debe restaurar una base sobre Directus activo ni sin conservar previamente
su estado actual. No se ejecutó ninguna restauración sobre los datos reales.

El servicio web de Docker ahora construye memora-v2. El arranque comprueba salud y
colecciones; no carga semillas ni ejecuta los preparadores de la versión antigua.
La imagen Docker sigue pendiente de una prueba en un entorno con Docker disponible.

## Siguiente entrega

Mejorar escena, personajes y continuidad visual sobre este recorrido verificable.
Después ampliar contenido y tipos de experiencias por entregables. No confundir
el catálogo pendiente ni una nueva ilustración con una funcionalidad ya verificada.
