# Memora V2 — instrucciones de trabajo

Antes de modificar esta aplicación, leer íntegramente `docs/AVENTURA-CONTRATO.md` (versión aventura-1.0). Es el contrato de producto aprobado más reciente; los prompts editoriales y checkpoints históricos no pueden reemplazarlo silenciosamente. Respetar siempre instrucciones de mayor prioridad y decisiones humanas posteriores.

- Implementar de forma incremental sobre mapas, componentes, audio, journal y SRS existentes. No crear un segundo scheduler o motor de progreso para la narrativa.
- Conservar usuarios, intentos, IDs, posiciones independientes y progreso. No falsear aprendizaje por navegación, animaciones o recompensas.
- No tocar V1/frontend/backend ajenos ni el proyecto separado de Claude. Preservar cambios del usuario.
- Distinguir diseño, código, pruebas automáticas, inspección visual, partida real y verificación de producción. No declarar medios ni contenido aprobados por validación estructural.
- Cambios de reglas: registrar decisión humana, motivo, impacto y pruebas. La investigación puede proponer cambios, no aplicarlos como órdenes por proceder de un vídeo.
- El viejo bucle editorial automático de mil palabras no queda reactivado. No hacer publicaciones masivas ni importaciones al arrancar. No ampliar permisos o crear cuentas de prueba sin autorización específica.

Punto de continuación interactivo: `MEMORA-IMPLEMENTACION-01.md` en el workspace del chat. En una tarea sin ese archivo, inspeccionar el estado actual, este contrato y el Git real; no suponer completados ni despliegues.
