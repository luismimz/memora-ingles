# Preparación por sentido y modelo vigente

Incremento sobre5036c82. Protege el método antes de ampliar cobertura: una coincidencia de letras no basta para exigir un significado o asociación nuevos.

Inicio, mapa de gramática y selección mixta comprueban ahora la equivalencia española declarada en la palabra requerida y su identidad/versión de asociación cuando existen. Case/Unicode/espacios no crean novedades; otro sentido o versión sí conserva la preparación pendiente. Una memoria legacy sin significado no se convierte en prueba de ese sentido. No se borra/recalcula la memoria ni un completado existente, no se cambian IDs o calendarios. La práctica y la introducción siguen separadas del dominio.

El resumen del catálogo conserva asociaciónId/associationVersion para que Inicio no dé un desbloqueo que la escena completa después rechaza. Requisitos externos que solo declaran una grafía, sin significado en la unidad, conservan el comportamiento anterior; deben ampliarse editorialmente para distinguir nuevos sentidos. No afirmar que esto resuelve toda la preparación de todas las expresiones.

Seguimiento técnico: al descargar la escena desde Inicio se sustituyen también sus palabras en los metadatos de revalidación. No basta actualizar contentVersion dejando equivalencias antiguas del mapa. Prueba de App simula cambio de sentido entre mapa y descarga y exige conservar memoria/borrador sin abrir el truco incorrecto.

Arcade usa el modelo actual de una palabra cuyo sentido/escena/asociación ya coinciden con la evidencia preparada, no la IPA o audioURL antiguos del snapshot de memoria. Esto selecciona la fuente vigente, no aprueba el audio ni registra una escucha/acierto por leerlo. No hay segundo motor, migración masiva ni modificación del backend.

Pruebas cubren sentido y versión distintos, preparación correcta, memoria incompleta, conservación del estado previo, metadatos del catálogo y actualización del modelo sin cambios en memoria. Fixtures antiguos que solo contenían key/correct se completan con el sentido realmente practicado, no se debilita el requisito para mantener tests verdes. Integración/build y copias en checkpoint. Pendientes revisión editorial, partida física/móvil, escucha humana y cobertura1050/3000.
