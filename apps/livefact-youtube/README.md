# LiveFact para Chrome

LiveFact acompaña al reproductor de YouTube con avisos cortos. Su panel lateral muestra las afirmaciones en una línea de tiempo. Cada marca abre el análisis y lleva al segundo de la cita cuando el reproductor todavía permite consultarlo.

## Instalar

Descomprime el ZIP y abre `chrome://extensions`. Activa **Modo desarrollador**, elige **Cargar descomprimida** y selecciona la carpeta `LiveFact-Chrome`, que contiene `manifest.json`. Si ya cargaste LiveFact, actualiza su instalación desde esa pantalla. Recarga las pestañas de YouTube y abre el panel con el icono de LiveFact.

Para compilar desde el repositorio, ejecuta `npm ci` y `npm run build --workspace @council/livefact-youtube`. Carga `apps/livefact-youtube/dist`. Usa `npm run typecheck --workspace @council/livefact-youtube` para comprobar los tipos.

## Probar la extensión

- En **Opciones y ensayo → Probar con un ejemplo**, reproduce el vídeo para ver avisos y marcas de ejemplo. La cronología incluye un dato respaldado, un dato contradicho y un argumento que necesita contexto. Todos están identificados como ensayo.
- **Iniciar análisis en directo** envía los nuevos subtítulos visibles al servidor elegido por bloques mientras avanza el vídeo. Funciona con el panel cerrado y se detiene desde el mismo botón o al cambiar de vídeo. Los avisos aparecen cuando el backend detecta o evalúa una afirmación.
- **Analizar subtítulos recientes** envía los últimos 25 segundos de subtítulos visibles. Activa CC antes de pulsar. Puedes elegir el backend local o el entorno de desarrollo del equipo. El envío puntual está en Opciones y ensayo.
- **Análisis** despliega contexto, evaluación, límites y fuentes cuando el servidor los devuelve. Pulsa el minuto o la marca para volver a la cita.
- **Avisos** controla las notificaciones sobre el vídeo. La cronología se mantiene en la pestaña hasta cambiar de vídeo o recargar.

## Contrato del equipo

El service worker usa `createApiClient` de `@council/contracts`. Envía pasajes con offsets UTF-16 y marcas de tiempo, consulta el progreso del run durante la extracción y la búsqueda de evidencia, y carga el detalle de cada afirmación al abrir su análisis. Los argumentos de ejemplo ilustran cómo juzgar si las premisas sostienen una conclusión. La API actual extrae afirmaciones factuales y aporta evaluaciones con fuentes.
