ALTER TABLE source_document
    ADD COLUMN extraction_status text NOT NULL DEFAULT 'pending'
        CHECK (extraction_status IN ('pending', 'extracted', 'empty_or_scanned', 'unsupported', 'error')),
    ADD COLUMN extraction_version text,
    ADD COLUMN extracted_at timestamptz,
    ADD COLUMN extraction_error text;

CREATE TABLE source_document_passage (
    snapshot_id bigint NOT NULL REFERENCES source_document(snapshot_id),
    passage_number integer NOT NULL CHECK (passage_number > 0),
    page_number integer CHECK (page_number > 0),
    html_location text,
    passage_text text NOT NULL CHECK (length(btrim(passage_text)) > 0),
    extraction_version text NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('simple', passage_text)
    ) STORED,
    PRIMARY KEY (snapshot_id, passage_number),
    CHECK (num_nonnulls(page_number, html_location) = 1)
);

CREATE INDEX source_document_passage_search_idx
    ON source_document_passage USING gin (search_vector);
