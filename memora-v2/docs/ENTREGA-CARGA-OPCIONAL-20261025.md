# No cargar herramientas opcionales al entrar

ContentManager, PhrasalFusionDemo y GrammarWorkshop pasan de imports estáticos a React.lazy, dentro de las mismas ramas y permisos de App. No se activa ninguna herramienta, contenido o piloto. Perfil, mapas, práctica y motor de memoria no cambian.

DeferredScreen limita Suspense/error a la pantalla solicitada, conserva el estado del padre y ofrece Volver durante la descarga y ante fallo. No hay reintentos automáticos. Una resolución tardía después de salir no navega de nuevo. Ante descarga fallida se explica la salida y posible recarga; no se promete que reabrir un lazy rechazado reintente solo.

24 pruebas enfocadas/3archivos;561/111 integración, TypeScript/Vite/diff correctos. Tres pruebas nuevas verifican espera cancelable/resolución tardía, apertura correcta sin clic extra y fallo con salida. App completa conserva reanudación/episodio. No inspección física/móvil/partida de autoría acreditada ni controles bloqueados eludidos.

Build: JSinicial627,03→583,41kB; gzip187,78→174,47kB. Nuevos chunks opcionales: ContentManager17,89kB, GrammarWorkshop12,93kB, PhrasalFusionDemo9,74kB y phrasalFamilies5,23kB. CSS131,22kB; el aviso principal>500kB persiste. Reducción de descarga inicial compilada, no velocidad móvil medida ni reducción del código total de todas las herramientas.

Revisión: inicio y práctica deben seguir disponibles sin abrir herramientas. En una sesión con permisos ya existentes, Herramientas→gestor/taller/laboratorio carga la pantalla solicitada, con salida durante la espera. No crear cuentas ni cambiar permisos para probar. La descarga HTTP de los chunks no equivale a haber jugado o usado las herramientas.
