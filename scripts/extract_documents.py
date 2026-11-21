#!/usr/bin/env python3
"""Prepare searchable passages from official documents already in PostgreSQL."""

import argparse
import io
import os
import sys
from pathlib import Path

import psycopg
from bs4 import BeautifulSoup
from pypdf import PdfReader

EXTRACTION_VERSION = "1"
MIGRATIONS = Path(__file__).resolve().parents[1] / "db" / "migrations"


def migrate(conn):
    with conn.transaction():
        conn.execute("SELECT pg_advisory_xact_lock(741013)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS schema_migration (
                name text PRIMARY KEY,
                applied_at timestamptz NOT NULL DEFAULT now()
            )
        """)
        applied = {name for (name,) in conn.execute("SELECT name FROM schema_migration")}
        for path in sorted(MIGRATIONS.glob("[0-9][0-9][0-9]_*.sql")):
            if path.name in applied:
                continue
            conn.execute(path.read_text(encoding="utf-8"))
            conn.execute("INSERT INTO schema_migration (name) VALUES (%s)", (path.name,))
            print(f"Applied {path.name}")


def extract_passages(content_type, content):
    if content_type == "application/pdf":
        reader = PdfReader(io.BytesIO(content))
        return [
            (number, None, text)
            for number, page in enumerate(reader.pages, 1)
            if (text := page.extract_text().strip())
        ]
    if content_type == "text/html":
        soup = BeautifulSoup(content, "html.parser")
        for node in soup.select("script, style, template, noscript, nav, header, footer, [hidden], [aria-hidden=true]"):
            node.decompose()
        main = soup.find("main") or soup.find(attrs={"role": "main"}) or soup.body or soup
        blocks = main.select("h1, h2, h3, h4, h5, h6, p, li, tr, blockquote")
        passages = []
        for index, block in enumerate(blocks, 1):
            if block.find(["p", "li", "tr", "blockquote"]):
                continue
            text = block.get_text(" ", strip=True)
            if text:
                passages.append((None, f"block:{index}", text))
        if not passages and (text := main.get_text(" ", strip=True)):
            passages.append((None, "main-text", text))
        return passages
    return None


def prepare(conn, snapshot_id):
    with conn.transaction():
        row = conn.execute(
            "SELECT content_type, content FROM source_document WHERE snapshot_id = %s FOR UPDATE",
            (snapshot_id,),
        ).fetchone()
        if row is None:
            raise ValueError(f"Snapshot {snapshot_id} has no stored document")
        error = None
        try:
            passages = extract_passages(*row)
        except Exception as exc:
            status, error, passages = "error", str(exc) or type(exc).__name__, []
        else:
            status = "unsupported" if passages is None else "extracted" if passages else "empty_or_scanned"
        conn.execute("DELETE FROM source_document_passage WHERE snapshot_id = %s", (snapshot_id,))
        with conn.cursor() as cursor:
            cursor.executemany("""
                INSERT INTO source_document_passage
                    (snapshot_id, passage_number, page_number, html_location, passage_text, extraction_version)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, [
                (snapshot_id, number, page, location, text, EXTRACTION_VERSION)
                for number, (page, location, text) in enumerate(passages or [], 1)
            ])
        conn.execute("""
            UPDATE source_document
            SET extraction_status = %s, extraction_version = %s,
                extracted_at = now(), extraction_error = %s
            WHERE snapshot_id = %s
        """, (status, EXTRACTION_VERSION, error, snapshot_id))
    print(f"Snapshot {snapshot_id}: {status}, {len(passages or [])} passages")
    return status


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--migrate-only", action="store_true")
    mode.add_argument("--snapshot-id", type=int, action="append")
    args = parser.parse_args()

    dsn = os.environ.get("DATABASE_URL")
    options = {} if dsn else {
        "host": "127.0.0.1", "port": os.environ.get("POSTGRES_PORT", "5432"),
        "dbname": "council", "user": "council",
        "password": os.environ.get("POSTGRES_PASSWORD", "council_local"),
    }
    with psycopg.connect(dsn or "", autocommit=True, **options) as conn:
        if args.migrate_only:
            migrate(conn)
            return 0
        snapshots = args.snapshot_id or [
            snapshot_id for (snapshot_id,) in conn.execute(
                "SELECT snapshot_id FROM source_document ORDER BY snapshot_id"
            )
        ]
        statuses = [prepare(conn, snapshot_id) for snapshot_id in dict.fromkeys(snapshots)]
        return int("error" in statuses)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (psycopg.Error, ValueError) as error:
        sys.exit(str(error))
