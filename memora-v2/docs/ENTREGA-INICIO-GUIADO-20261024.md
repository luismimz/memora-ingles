# Inicio guiado: orientación antes que modos

Petición humana: cambiar también la interacción, colores y diseño; al entrar debe quedar claro dónde estoy, qué toca y qué he practicado. Sustituye la prioridad anterior de ampliar episodios alimentarios.

## Implementado

- JourneyHome conserva el selector y checkpoints existentes, pero muestra una sola acción principal: continuar la actividad real. Montaje y conversación tienen encabezados específicos al reanudar.
- Palabras con práctica registrada visibles; evidencias, mapa y práctica libre quedan en tres desplegables cerrados. Perfil, apariencia y salida pasan al menú. El catálogo no se presenta como aprendizaje ni el scroll como progreso.
- Paleta compartida verde petróleo, superficies claras y modo oscuro coordinado. Botón principal consistente; cabecera de práctica incorpora ubicación y separa el paso actual. En móvil el arte decorativo se oculta y continuar ocupa el ancho disponible.
- Sin migrar progreso, crear scheduler, cambiar requisitos didácticos ni borrar rutas opcionales. Contraste de tokens de texto y acción comprobado en ambos temas. Selectores del inicio reforzados frente a estilos globales tardíos.

## Verificación y límites

551 pruebas/109 archivos en integración funcional; tras trasladar la prueba de tokens de TypeScript a scripts/designTokens.test.mjs, 20 pruebas enfocadas/5 archivos y build TypeScript/Vite/diff correctos. Se conserva aviso de bundle principal >500 kB (626,08 kB).

No se atribuyen inspección visual física del navegador/móvil, partida, audio escuchado, diversión ni memoria diferida. Controles de navegador bloqueados anteriormente no se reintentan ni eluden. El diseño necesita validación humana en pantalla. Esta entrega simplifica el inicio y cabecera compartida, no afirma rediseñar todas las pantallas o terminar el método.

Recorrido de revisión: entrar a Memora → inicio → comprobar «Ahora te toca»/«Justo donde lo dejaste» → Continuar jugando → salir y volver para reanudar. Abrir opcionalmente «Lo que he practicado», «Ver mi recorrido» y «Practicar por mi cuenta». Menú permite alternar tema.

El borrador de huevo no integrado se conserva fuera del runtime en el checkpoint del proyecto, MEMORA-BORRADORES/eggCookingPractice.ts.txt. No se publica ni se pierde.

Siguiente: simplificar dentro de la actividad el avance y salida manteniendo evidencia, ayudas y estado existentes; priorizar fricción observable sobre nuevos episodios ocultos.
