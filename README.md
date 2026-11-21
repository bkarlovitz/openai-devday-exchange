# Datos del verificador del pleno de Barcelona

PostgreSQL 17 con pgvector. Las filas publicadas se consultan con SQL y los embeddings del catálogo se pueden añadir después. La carga funciona sin backend.

## Arranque local

Requiere Docker Compose y Python 3.10 o posterior.

```sh
docker compose up -d --wait
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/ingest.py
```

La base se llama `council`, escucha en localhost y utiliza el usuario `council`. Si cambias `POSTGRES_PORT` o `POSTGRES_PASSWORD`, exporta las variables para que las lean tanto Compose como el script. El script también acepta `DATABASE_URL`.

```sh
# Verificar todas las descargas y los parsers sin Docker, pip ni credenciales
python3 scripts/ingest.py --check

# Cargar solo Incasòl y los dos CSV más recientes del padrón
.venv/bin/python scripts/ingest.py --source incasol --source population --population-files 2

# Con OPENAI_API_KEY exportada, añadir vectores a las fichas ya cargadas
.venv/bin/python scripts/ingest.py --embed-only

# Con GOOGLE_FACT_CHECK_API_KEY exportada, guardar una búsqueda opcional
.venv/bin/python scripts/ingest.py --source fact-check --fact-query 'lloguer Barcelona'
```

Por defecto se descargan todos los CSV del padrón que CKAN anuncia. La carga continúa si falla una fuente, informa del error y sale con código distinto de cero. Cada fuente se escribe en una transacción. Volver a cargar el mismo recurso conserva su versión y actualiza la fecha de la última descarga. Los CSV mantienen las columnas y los valores originales como JSONB, incluidos ceros iniciales en códigos. INE queda en una fila por observación, con los campos de su serie. Las fichas se vectorizan con `text-embedding-3-small` y el vector se vuelve a generar si cambia su texto.

## Fuentes de los planes

| Fuente | Acceso y alcance |
| --- | --- |
| [Open Data BCN](https://opendata-ajuntament.barcelona.cat/en/node/1440) | `package_search` sirve para descubrir datasets. Para la carga se usa `package_show` y se siguen las URLs CSV del catálogo. `datastore_search` funciona para recursos habilitados, pero en las pruebas devolvió 503 para el recurso turístico. |
| [Viviendas turísticas](https://opendata-ajuntament.barcelona.cat/data/en/dataset/habitatges-us-turistic) | Registro descargable en CSV con expediente, distrito, barrio y plazas. El fichero describe el registro publicado. Para atribuir cifras a fechas pasadas hacen falta descargas de aquellas fechas u otra serie histórica. |
| [Padrón](https://opendata-ajuntament.barcelona.cat/data/dataset/pad_mdbas) | CSV por año de referencia. Las columnas pueden variar entre años y se conservan por recurso. |
| [Incasòl](https://analisi.transparenciacatalunya.cat/Habitatge/Preu-mitj-del-lloguer-d-habitatges-per-municipi/qww9-bvhh) | CSV y metadatos Socrata del dataset `qww9-bvhh`, enlazado desde [datos.gob.es](https://datos.gob.es/es/catalogo/a09002970-registro-de-las-fianzas-de-alquiler-de-viviendas-por-municipio). Los periodos son los que publica la fuente. Para comparar rentas hay que comprobar también área y tramo de precios. |
| [INE 59061](https://www.ine.es/jaxiT3/Tabla.htm?t=59061) | [API JSON de INE](https://www.ine.es/dyngs/DAB/en/index.htm?cid=1100) con índices de alquiler por distritos de municipios capitales de provincia. Para conocer la renta media en euros se usa la fuente de Incasòl con el ámbito correspondiente. |
| [Consell Municipal](https://ajuntament.barcelona.cat/ca/accio-de-govern/el-consell-municipal) y [acta de muestra](https://ajuntament.barcelona.cat/sites/default/files/2025-12/CPlenari%2031-10-25-Acta.pdf) | Se guarda el HTML y los enlaces directos a PDF, DOCX y YouTube que aparecen en él. El acta de octubre de 2025 se descarga aparte como PDF. La carga cubre los enlaces presentes en la página y ese PDF. |
| [Google Fact Check](https://developers.google.com/fact-check/tools/api/reference/rest/v1alpha1/claims/search) | Consulta paginada por texto con clave. Se guarda como contexto editorial y el comando se ejecuta bajo demanda. |
| OpenAI, Chrome y estándares de ingeniería | Los enlaces de los planes sobre transcripción, extracción, tools y extensión corresponden a documentación para etapas posteriores. El enlace al repositorio de estándares devolvió 404 en la revisión. |

## Resultado de la comprobación

`--check` descargó y procesó 10.707 filas de viviendas turísticas, 32.031 del padrón en 30 CSV, 47.541 de Incasòl, 11.424 observaciones de INE, cuatro enlaces municipales y el acta en PDF. Los recuentos son los de esa descarga. Para incorporar los archivos de un pleno distinto, hay que identificar sus enlaces concretos.

## Consultar la carga

```sh
docker compose exec db psql -U council -d council
```

```sql
SELECT dataset_id, count(*) AS resources, sum(row_count) AS rows
FROM latest_snapshot
GROUP BY dataset_id
ORDER BY dataset_id;

SELECT s.resource_url, s.sha256, r.row_number, r.data
FROM latest_snapshot AS s
JOIN source_row AS r ON r.snapshot_id = s.id
WHERE s.dataset_id = 'incasol'
LIMIT 5;
```

Para buscar por similitud, obtén el vector de la consulta con el mismo modelo y ordena las fichas por `embedding <=> $1::vector`. El catálogo inicial es pequeño y usa distancia exacta. Las comparaciones factuales se hacen con las filas y sus periodos.

### Caso de referencia de Incasòl

Este ejemplo compara el segundo trimestre de 2025 con el de 2026 para el municipio de Barcelona (`08019`) y el tramo publicado `> 600 euros/mes`. La comparación usa datos oficiales y sirve como caso de integración.

```sh
docker compose exec -T db psql -XAt -v ON_ERROR_STOP=1 -U council -d council \
  -v baseline_year=2025 -v baseline_period=abril-juny \
  -v target_year=2026 -v target_period=abril-juny \
  < scripts/incasol-comparison.sql
```

En la descarga comprobada, la renta media de este tramo pasó de **1.135,55** a **1.140,89 €/mes** (+**0,47 %**). El JSON incluye las filas originales, el identificador y el hash del snapshot, la URL del CSV y la fórmula. Añade `-v snapshot_id=ID` para repetir la consulta contra un snapshot concreto de tu base. Con `target_year=2099` el script devuelve `missing_period` y conserva la fila disponible.

Campos observados para los adaptadores de TASK-012:

| Dataset | Campos iniciales |
| --- | --- |
| Incasòl | `Àmbit territorial`, `Codi territorial`, `Any`, `Període`, `Tram de preus`, `Renda` y `Habitatges`. Los valores de CSV se guardan como texto. |
| Padrón | `Data_Referencia`, `Codi_Districte`, `Codi_Barri`, `Seccio_Censal` y `Valor`. Verificar las columnas por recurso histórico. |
| Viviendas turísticas | `N_EXPEDIENT`, `CODI_DISTRICTE`, `CODI_BARRI` y `NUMERO_PLACES`. Conservar los ceros iniciales de los códigos. |
| INE 59061 | `COD`, `Nombre`, `Anyo`, `Fecha`, `Valor`, identificadores de unidad, escala y periodo, y `Secreto`. Usar el código de serie y comprobar su unidad antes de comparar. |
