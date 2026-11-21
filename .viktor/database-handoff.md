# TASK-012 · Contrato propuesto y comprobaciones locales

Propuesta para acordar con A antes de registrar las tools en el Worker. La consulta SQL y el fixture de Incasòl permiten probar el consumidor sin conexión al Worker.

| Tool | Entrada propuesta | Salida mínima |
| --- | --- | --- |
| `search_catalogue` | Texto de búsqueda y límite | Fichas con `datasetId`, descripción y URL oficial. La búsqueda por texto funciona aunque falten embeddings. |
| `inspect_dataset` | `datasetId` | Recursos, versiones actuales, campos permitidos, unidades y límites de cobertura conocidos. |
| `query_dataset` | `datasetId`, `resourceKey`, `snapshotId?`, filtros tipados por dataset, límite y cursor opcional | Versión elegida, filas y argumentos validados. La siguiente página debe conservar el mismo `snapshotId`. |

El identificador del snapshot viaja como string. El resultado incluye hash, URL, fecha de descarga, última fecha de observación del snapshot, número de fila y periodo observado. Las filas mantienen el JSON original. Una consulta válida sin filas devuelve un resultado vacío. Una versión solicitada que no pertenece al recurso, un campo fuera del contrato o un fallo de conexión se comunican explícitamente.

## Hallazgos en el Postgres local

| Fuente | Forma comprobada | Consecuencia para el adaptador |
| --- | --- | --- |
| Incasòl | 47.541 filas, 20.947 con `Renda` vacía. Siete etiquetas distintas de tramo en el histórico. | Filtrar por ámbito, código territorial, año, periodo y etiqueta exacta. Tratar la cadena vacía como valor ausente. No sumar tramos históricos. |
| Padrón | 32.031 filas en 30 recursos, con fechas de referencia de enero de 1997 a enero de 2026. Las mismas ocho columnas en los recursos cargados. | Identificar el recurso por fecha y exponer la sección censal. Validar que las filas sumadas pertenecen a la misma fecha y al ámbito pedido. |
| Viviendas turísticas | 10.707 expedientes en un recurso. Códigos de ámbito como `01`. | Conservar códigos como texto. El número de expedientes y las plazas son medidas distintas. |
| INE 59061 | 11.424 observaciones, 1.714 con `Valor` nulo o ausente. Códigos de unidad, escala y periodo presentes. | Consultar por código de serie y año. Respetar nulos y el indicador de secreto. Mantener los códigos de unidad y escala hasta verificar su interpretación por serie. |

En las versiones locales consultadas no aparecieron duplicados dentro del mismo recurso para ámbito/código/año/periodo/tramo (Incasòl), fecha/sección (padrón), expediente (turismo) ni serie/año/periodo (INE). Son comprobaciones del contenido cargado y deben repetirse si cambia el esquema de una fuente.

## Implementación integrada

El contrato operativo está en packages/contracts/src/database.ts y las funciones en apps/api/src/research/catalogue.ts y query-dataset.ts. La API de desarrollo ofrece POST /api/dev/evidence/search, /inspect y /query. La paginación usa offset y limit con el snapshotId devuelto. La respuesta conserva el JSON original en data y devuelve selectedValues cuando se solicitan campos concretos. La conexión Neon/Hyperdrive se ha comprobado con la misma consulta de referencia de Incasòl.
