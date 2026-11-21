CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS dataset (
    id text PRIMARY KEY,
    source_url text NOT NULL,
    search_text text NOT NULL,
    metadata jsonb NOT NULL,
    embedding vector(1536),
    embedding_model text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snapshot (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset(id),
    resource_key text NOT NULL,
    resource_url text NOT NULL,
    sha256 text NOT NULL,
    fetched_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    row_count integer NOT NULL CHECK (row_count >= 0),
    UNIQUE (dataset_id, resource_key, sha256)
);

CREATE TABLE IF NOT EXISTS source_row (
    snapshot_id bigint NOT NULL REFERENCES snapshot(id),
    row_number integer NOT NULL,
    data jsonb NOT NULL,
    PRIMARY KEY (snapshot_id, row_number)
);

CREATE TABLE IF NOT EXISTS source_document (
    snapshot_id bigint PRIMARY KEY REFERENCES snapshot(id),
    content_type text NOT NULL,
    content bytea NOT NULL
);

CREATE OR REPLACE VIEW latest_snapshot AS
SELECT DISTINCT ON (dataset_id, resource_key) *
FROM snapshot
ORDER BY dataset_id, resource_key, last_seen_at DESC, id DESC;
