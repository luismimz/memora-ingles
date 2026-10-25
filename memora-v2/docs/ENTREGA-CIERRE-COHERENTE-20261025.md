# Cierre coherente y limpieza de lo sustituido

Petición humana: orden, simplificación y revisión del conjunto, no más capas de navegación. Tras contraste de código y contenido de la referencia pública actual, se completa el borrador preservado sin copiar contenido ni modificar el otro proyecto.

## Resultado

LanguageGame y JourneyTrickExperience usan PracticeClosure. Continuar y Terminar por hoy quedan claros; en episodio vertical, Continuar sigue en la franja inferior y no se duplica. Eco, Arcade e historial del cierre anterior son opcionales en un desplegable cerrado. Los callbacks y el motor de progreso siguen siendo los existentes. La conversación y la palabra inicial no cambian por esta presentación.

Retirados complete-voluntary y sus estilos sin referencias restantes. Se sustituye «ya puedes» por práctica realizada y se elimina la afirmación de fijar memoria a una hora concreta del cierre; no cambia la programación del SRS. AGENTS y contrato antiguos pasan a señalar la guía consolidada por decisión humana, sin otra matriz ni cola histórica.

## Verificación

556 pruebas/110 archivos, TypeScript/Vite y diff correctos. Prueba de LanguageGame montada alcanza el cierre desde la última construcción mediante botón real; continuar conserva callback y no añade otro intento del alumno. Pruebas de presentación cubren opciones cerradas, callbacks, ausencia de desplegable vacío y avance sin duplicación. Tests App/episodio conservan salida, reanudación y conversación.

No inspección física del navegador/móvil, partida, audio escuchado, diversión ni retención acreditados. No se reintentan controles bloqueados. Bundle principal626,24kB, aviso >500kB conservado. No se ha hecho limpieza global de todo el CSS ni se ha demostrado que el diseño resulte intuitivo en uso.

## Revisión humana

Entrar→Continuar→terminar una práctica preparada. En el cierre vertical, continuar está en la franja inferior y Terminar por hoy en la tarjeta. En el cierre de escena anterior, ambos están juntos y Eco/Arcade/historial bajo «Escuchar o practicar más». Salir/reanudar no reinicia progreso. No hace falta empezar otra cuenta ni repetir una escena completada solo para probar.

Esta entrega no incorpora las1303 entradas de términos o92 patrones contados en la referencia, ni publica catálogo/medios nuevos. Es una mejora parcial de coherencia, no el rediseño global o curso terminado.
