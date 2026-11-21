#!/usr/bin/env python3
"""Fetch official datasets and optionally store versioned evidence in Postgres."""

import argparse
import csv
import hashlib
import io
import json
import os
import sys
import time
from dataclasses import dataclass, field
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin, urlsplit
from urllib.request import Request, urlopen

CKAN = "https://opendata-ajuntament.barcelona.cat/data/api/3/action/"
OPEN_DATA = "https://opendata-ajuntament.barcelona.cat/data/dataset/"
GENCAT = "https://analisi.transparenciacatalunya.cat"
INE = "https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/59061"
COUNCIL = "https://ajuntament.barcelona.cat/ca/accio-de-govern/el-consell-municipal"
MINUTES = "https://ajuntament.barcelona.cat/sites/default/files/2025-12/CPlenari%2031-10-25-Acta.pdf"
FACT_CHECK = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
DEFAULT_SOURCES = ("tourist-flats", "population", "incasol", "ine-59061", "council", "minutes")
EMBEDDING_MODEL = "text-embedding-3-small"


@dataclass
class Resource:
    key: str
    url: str
    body: bytes
    rows: list[dict] = field(default_factory=list)
    content_type: str | None = None


@dataclass
class Dataset:
    id: str
    url: str
    search_text: str
    metadata: dict
    resources: list[Resource]


def fetch(url, *, headers=None, payload=None):
    request = Request(
        url,
        headers={"User-Agent": "council-source-ingest/1.0", **(headers or {})},
        data=payload,
    )
    for attempt in range(3):
        try:
            with urlopen(request, timeout=90) as response:
                return response.read(), response.headers.get_content_type()
        except HTTPError as error:
            if error.code not in {429, 500, 502, 503, 504} or attempt == 2:
                raise RuntimeError(f"{urlsplit(url).hostname}: HTTP {error.code}") from None
        except (URLError, TimeoutError) as error:
            if attempt == 2:
                raise RuntimeError(f"{urlsplit(url).hostname}: {error}") from None
        time.sleep(2 ** attempt)


def parse_csv(body):
    try:
        contents = body.decode("utf-8-sig")
    except UnicodeDecodeError:
        contents = body.decode("cp1252")
    if contents.lstrip().startswith("<"):
        raise ValueError("Expected CSV, received markup")
    sample = "\n".join(contents.splitlines()[:10])
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(contents, newline=""), dialect=dialect)
    fields = reader.fieldnames
    if not fields or len(fields) < 2 or len(set(fields)) != len(fields):
        raise ValueError("Missing or ambiguous CSV header")
    rows = []
    for row in reader:
        if None in row or any(value is None for value in row.values()):
            raise ValueError(f"Invalid CSV record ending at line {reader.line_num}")
        rows.append(row)
    if not rows:
        raise ValueError("CSV contains no data rows")
    return rows


def load_ckan(source, slug, description, resource_limit):
    api_url = CKAN + "package_show?" + urlencode({"id": slug})
    package = json.loads(fetch(api_url)[0])["result"]
    downloads = [
        item for item in package["resources"]
        if (item.get("format") or "").strip().lower() == "csv"
    ]
    if source == "population":
        downloads.sort(key=lambda item: item.get("name") or "", reverse=True)
    if not downloads:
        raise ValueError("CKAN package has no CSV resources")
    resources = []
    for item in downloads[:resource_limit]:
        body, _ = fetch(item["url"])
        resources.append(Resource(item["id"], item["url"], body, parse_csv(body)))
    notes = package.get("notes_translated") or {}
    search_text = "\n".join(filter(None, [description, *notes.values()]))
    return Dataset(source, OPEN_DATA + slug, search_text, package, resources)


def load_incasol():
    url = GENCAT + "/api/views/qww9-bvhh/rows.csv?accessType=DOWNLOAD"
    body, _ = fetch(url)
    metadata = json.loads(fetch(GENCAT + "/api/views/qww9-bvhh")[0])
    description = (
        "Preu mitjà del lloguer d’habitatges per municipi. Alquiler mensual medio "
        "y número de contratos del registro de fianzas de Incasòl. "
        "Usar el periodo y el tramo de precios publicados en cada fila."
    )
    return Dataset(
        "incasol", GENCAT + "/d/qww9-bvhh", description, metadata,
        [Resource("qww9-bvhh", url, body, parse_csv(body))],
    )


def load_ine():
    body, _ = fetch(INE)
    series = json.loads(body)
    rows = []
    for entry in series:
        dimensions = {key: value for key, value in entry.items() if key != "Data"}
        rows.extend({**dimensions, **observation} for observation in entry["Data"])
    if not rows:
        raise ValueError("INE returned no observations")
    return Dataset(
        "ine-59061", "https://www.ine.es/jaxiT3/Tabla.htm?t=59061",
        "INE. Índice de precios de la vivienda en alquiler por distritos "
        "de municipios capitales de provincia. Índices y variaciones publicados, "
        "por año. Índex de preus del lloguer per districtes.",
        {"table_id": 59061, "series_count": len(series)},
        [Resource("59061", INE, body, rows)],
    )


class CouncilLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = set()

    def handle_starttag(self, tag, attrs):
        attribute = {"a": "href", "iframe": "src"}.get(tag)
        if not attribute:
            return
        value = dict(attrs).get(attribute)
        if value:
            url = urljoin(COUNCIL, value)
            parts = urlsplit(url)
            if parts.scheme in {"https", "http"} and (
                parts.path.lower().endswith((".pdf", ".docx"))
                or parts.hostname in {
                    "youtube.com", "www.youtube.com", "youtu.be", "www.youtube-nocookie.com",
                }
            ):
                self.links.add(url)


def load_council():
    body, content_type = fetch(COUNCIL)
    parser = CouncilLinks()
    parser.feed(body.decode("utf-8"))
    rows = [{"url": url} for url in sorted(parser.links)]
    return Dataset(
        "council", COUNCIL, "Consell Municipal de Barcelona. Plens, actes, "
        "ordres del dia, acords, vídeos. Plenos, actas y acuerdos municipales.",
        {}, [Resource("landing-page", COUNCIL, body, rows, content_type)],
    )


def load_minutes():
    body, _ = fetch(MINUTES)
    if not body.startswith(b"%PDF-"):
        raise ValueError("The council minutes download is not a PDF")
    return Dataset(
        "minutes", MINUTES, "Acta del Plenari del Consell Municipal de Barcelona "
        "del 31 d’octubre de 2025.",
        {"session_date": "2025-10-31"},
        [Resource("2025-10-31", MINUTES, body, content_type="application/pdf")],
    )


def load_fact_checks(query):
    key = os.environ.get("GOOGLE_FACT_CHECK_API_KEY")
    if not key or not query:
        raise ValueError("Set GOOGLE_FACT_CHECK_API_KEY and pass --fact-query")
    page_token = None
    resources = []
    query_id = hashlib.sha256(query.encode()).hexdigest()
    while True:
        params = {"query": query, "pageSize": 50}
        if page_token:
            params["pageToken"] = page_token
        url = FACT_CHECK + "?" + urlencode(params)
        body, _ = fetch(url + "&" + urlencode({"key": key}))
        result = json.loads(body)
        resources.append(Resource(f"{query_id}:{len(resources) + 1}", url, body, result.get("claims", [])))
        page_token = result.get("nextPageToken")
        if not page_token:
            break
    return Dataset(
        "fact-check", "https://developers.google.com/fact-check/tools/api/reference/rest/v1alpha1/claims/search",
        "Google Fact Check. Verificaciones publicadas anteriormente. "
        "Contexto editorial para una afirmación, sin cifras oficiales propias.",
        {}, resources,
    )


def save(conn, dataset):
    from psycopg.types.json import Jsonb

    with conn.transaction(), conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO dataset AS existing (id, source_url, search_text, metadata)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                source_url = EXCLUDED.source_url,
                metadata = EXCLUDED.metadata,
                embedding = CASE WHEN existing.search_text = EXCLUDED.search_text
                            THEN existing.embedding END,
                embedding_model = CASE WHEN existing.search_text = EXCLUDED.search_text
                                  THEN existing.embedding_model END,
                search_text = EXCLUDED.search_text,
                updated_at = now()
            """,
            (dataset.id, dataset.url, dataset.search_text, Jsonb(dataset.metadata)),
        )
        for resource in dataset.resources:
            cursor.execute(
                """
                INSERT INTO snapshot (dataset_id, resource_key, resource_url, sha256, row_count)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (dataset_id, resource_key, sha256) DO UPDATE SET
                    resource_url = EXCLUDED.resource_url,
                    last_seen_at = now()
                RETURNING id
                """,
                (dataset.id, resource.key, resource.url, hashlib.sha256(resource.body).hexdigest(),
                 len(resource.rows)),
            )
            snapshot_id = cursor.fetchone()[0]
            cursor.execute("SELECT 1 FROM source_row WHERE snapshot_id = %s LIMIT 1", (snapshot_id,))
            if resource.rows and cursor.fetchone() is None:
                with cursor.copy("COPY source_row (snapshot_id, row_number, data) FROM STDIN") as copy:
                    for number, row in enumerate(resource.rows, 1):
                        copy.write_row((snapshot_id, number, Jsonb(row)))
            if resource.content_type:
                cursor.execute(
                    "INSERT INTO source_document VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                    (snapshot_id, resource.content_type, resource.body),
                )


def embed_catalog(conn):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise ValueError("Set OPENAI_API_KEY to generate catalogue embeddings")
    rows = conn.execute(
        "SELECT id, search_text FROM dataset WHERE embedding IS NULL "
        "OR embedding_model IS DISTINCT FROM %s ORDER BY id",
        (EMBEDDING_MODEL,),
    ).fetchall()
    if not rows:
        return
    data, _ = fetch(
        "https://api.openai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        payload=json.dumps({"model": EMBEDDING_MODEL, "input": [text for _, text in rows]}).encode(),
    )
    vectors = {item["index"]: item["embedding"] for item in json.loads(data)["data"]}
    with conn.transaction():
        for index, (dataset_id, search_text) in enumerate(rows):
            conn.execute(
                "UPDATE dataset SET embedding = %s::vector, embedding_model = %s "
                "WHERE id = %s AND search_text = %s",
                (json.dumps(vectors[index]), EMBEDDING_MODEL, dataset_id, search_text),
            )


def run(args, conn, sources):
    loaders = {
        "tourist-flats": lambda: load_ckan(
            "tourist-flats", "habitatges-us-turistic",
            "Registre d’habitatges d’ús turístic de Barcelona. Viviendas de uso turístico "
            "registradas, por distrito y barrio. Consultar viviendas y plazas por separado.",
            None,
        ),
        "population": lambda: load_ckan(
            "population", "pad_mdbas",
            "Padró municipal d’habitants de Barcelona a 1 de gener. "
            "Población empadronada anual por sección censal, barrio y distrito.",
            args.population_files,
        ),
        "incasol": load_incasol,
        "ine-59061": load_ine,
        "council": load_council,
        "minutes": load_minutes,
        "fact-check": lambda: load_fact_checks(args.fact_query),
    }
    failed = False
    for source in sources:
        try:
            dataset = loaders[source]()
            if conn:
                save(conn, dataset)
            print(f"{source}: {len(dataset.resources)} recursos, "
                  f"{sum(len(resource.rows) for resource in dataset.resources)} filas", flush=True)
        except Exception as error:
            failed = True
            print(f"{source}: {error}", file=sys.stderr)
    if args.embed:
        embed_catalog(conn)
    return int(failed)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", action="append", choices=(*DEFAULT_SOURCES, "fact-check"))
    parser.add_argument("--check", action="store_true", help="Fetch and parse without writing to Postgres")
    parser.add_argument("--embed", action="store_true", help="Embed catalogue entries after loading")
    parser.add_argument("--embed-only", action="store_true", help="Embed existing entries without downloading")
    parser.add_argument("--population-files", type=int, help="Limit the number of population CSVs, newest first")
    parser.add_argument("--fact-query", help="Query to send to the optional Google Fact Check source")
    args = parser.parse_args()
    if args.check and (args.embed or args.embed_only):
        parser.error("--check cannot be combined with embeddings")
    if args.population_files is not None and args.population_files < 1:
        parser.error("--population-files must be positive")
    sources = list(dict.fromkeys(args.source or DEFAULT_SOURCES))
    if args.check:
        return run(args, None, sources)
    import psycopg

    with psycopg.connect(
        os.environ.get("DATABASE_URL", ""),
        autocommit=True,
        **({} if os.environ.get("DATABASE_URL") else {
            "host": "127.0.0.1",
            "port": os.environ.get("POSTGRES_PORT", "5432"),
            "dbname": "council", "user": "council",
            "password": os.environ.get("POSTGRES_PASSWORD", "council_local"),
        }),
    ) as conn:
        if args.embed_only:
            embed_catalog(conn)
            return 0
        return run(args, conn, sources)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, ValueError) as error:
        sys.exit(str(error))
