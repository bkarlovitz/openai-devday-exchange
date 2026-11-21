# Wingman para Chrome

Wingman acompaña al reproductor de YouTube con avisos cortos. Su panel lateral muestra las afirmaciones en una línea de tiempo. Cada marca abre el análisis y lleva al segundo de la cita cuando el reproductor todavía permite consultarlo.

## Instalar

Descomprime el ZIP y abre `chrome://extensions`. Activa **Modo desarrollador**, elige **Cargar descomprimida** y selecciona la carpeta `LiveFact-Chrome`, que contiene `manifest.json`. Si ya cargaste Wingman, actualiza su instalación desde esa pantalla. Recarga las pestañas de YouTube y abre el panel con el icono de Wingman.

Para compilar desde el repositorio, ejecuta `npm ci` y `npm run build --workspace @council/livefact-youtube`. Carga `apps/livefact-youtube/dist`. Usa `npm run typecheck --workspace @council/livefact-youtube` para comprobar los tipos.

## Probar la extensión

Activa **Opciones y ensayo → Sonido de avisos** si quieres oír un arrullo breve al aparecer un resultado. Pulsa el reproductor una vez y deja el vídeo con volumen. Puedes probarlo con **Probar aviso**.

En un vídeo de YouTube, activa **Avisos** y pulsa **Probar aviso** para ver la última tarjeta o, si la lista está vacía, un ejemplo identificado. El aviso también funciona en pausa.

- En **Opciones y ensayo → Probar con un ejemplo**, reproduce el vídeo para ver avisos y marcas de ejemplo. La cronología incluye un dato respaldado, un dato contradicho y un argumento que necesita contexto. Todos están identificados como ensayo.
- **Iniciar análisis en directo** envía los nuevos subtítulos visibles al servidor elegido por bloques mientras avanza el vídeo. Funciona con el panel cerrado y se detiene desde el mismo botón o al cambiar de vídeo. Los avisos aparecen cuando el backend detecta o evalúa una afirmación.
- **Por enlace** importa un tramo de hasta 180 segundos mediante `POST /api/runs/youtube` del equipo. Puedes indicar inicio y fin en segundos. Con fin vacío analiza hasta 30 segundos. El inicio puede venir del tiempo del enlace o del reproductor. Funciona con los CC del reproductor apagados si el importador puede recuperar una pista. El modo en directo sigue leyendo los CC visibles.
- **Analizar subtítulos recientes** envía los últimos 25 segundos de subtítulos visibles. Activa CC antes de pulsar. Puedes elegir el backend local o el entorno de desarrollo del equipo. El envío puntual está en Opciones y ensayo.
- **Análisis** despliega contexto, evaluación, límites y fuentes cuando el servidor los devuelve. Pulsa el minuto o la marca para volver a la cita.
- **Avisos** controla las notificaciones sobre el vídeo. La cronología se mantiene en la pestaña hasta cambiar de vídeo o recargar.

## Contrato del equipo

El service worker usa `createApiClient` de `@council/contracts`. Envía pasajes con offsets UTF-16 y marcas de tiempo, consulta el progreso del run durante la extracción y la búsqueda de evidencia, y carga el detalle de cada afirmación al abrir su análisis. Los argumentos de ejemplo ilustran cómo juzgar si las premisas sostienen una conclusión. La API actual extrae afirmaciones factuales y aporta evaluaciones con fuentes.

## Fragmento para el jurado · 14:05–14:40

En el vídeo de EL PAÍS del 13 de enero de 2025, Pedro Sánchez cifra en un 48 % el aumento del precio de la vivienda en Europa durante la última década. La captura del ensayo del equipo sitúa el porcentaje en torno a 14:15. La Moncloa recoge la intervención completa.

1. En Chrome, abre Wingman en una pestaña de YouTube y pulsa **Opciones y ensayo → Ver fragmento del 48 %**. También puedes usar el [enlace al fragmento con reproducción del análisis guardado](https://www.youtube.com/watch?v=kvm8yYvF1Ws&t=845s#livefact-demo).
2. Deja **Avisos** activo, reproduce desde 14:05 y espera a 14:15. La extensión presenta una síntesis del resultado guardado. Pulsa el aviso y abre la fuente o la comprobación original en el panel.
3. Para un análisis nuevo, abre [el mismo minuto en modo normal](https://www.youtube.com/watch?v=kvm8yYvF1Ws&t=845s), activa los CC en español, elige **Desarrollo del equipo** e inicia el análisis en directo. La segmentación de los CC y el tiempo de investigación pueden cambiar las afirmaciones y el resultado.

**Resultado observado.** El backend compartido recibió la cita completa de la transcripción oficial. Devolvió evidencia mixta y una referencia de Eurostat. Su serie muestra un 48 % para la UE entre 2010 y 2023. El ámbito geográfico y el intervalo difieren de los expresados en el discurso. La repetición guardada funciona aunque el servicio tarde en responder. La verificación en directo envía los subtítulos que realmente entrega YouTube.

[Discurso de La Moncloa](https://www.lamoncloa.gob.es/presidente/intervenciones/Paginas/2025/20250113-acto-vivienda.aspx) · [Serie de Eurostat](https://ec.europa.eu/eurostat/web/interactive-publications/housing-2024) · [Resultado del backend](https://council-checker-dev.snapnda.workers.dev/runs/efce044b-942d-4dee-a77e-f047c5642210)
