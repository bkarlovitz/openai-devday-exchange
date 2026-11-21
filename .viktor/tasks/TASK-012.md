# TASK-012: Connect the existing evidence database through Neon and Hyperdrive

## Objective

Query the loaded catalogue and snapshots from the Worker while preserving the existing Python ingestion path.

## Milestone

M2: Cited factual assessments. Together with TASK-003 and TASK-004, this milestone lets a reader inspect cited assessments using stored official data and web sources.

## Why

The pulled database and ingestion implementation provides versioned official data that the application should reuse.

## Requirements

- Keep compose.yaml and scripts/ingest.py as local database and loading entry points. Extend README.md setup instructions. Apply db/schema.sql to an isolated Neon development database with pgvector, then load a representative source subset through the existing DATABASE_URL support.
- Add apps/api/src/db/client.ts and schema.ts using Drizzle with a Workers-compatible PostgreSQL driver. Map the existing dataset, snapshot, source_row, source_document, and latest_snapshot structures accurately, including bigint IDs serialized as strings at the API boundary.
- Provision the Hyperdrive binding in tooling/infra/alchemy.run.ts with nodejs_compat. Use local Hyperdrive connection configuration for Docker development and a direct Neon connection for Python ingestion. Load credentials through environment/secrets or securely connected Executor accounts.
- Implement research/catalogue.ts and research/query-dataset.ts with validated search_catalogue, inspect_dataset, and query_dataset tools. Start with metadata/text catalogue search. Use optional existing catalogue embeddings only with the same text-embedding-3-small model and 1536 dimensions. Missing embeddings must preserve discovery.
- Use allowlisted parameterized filters, fields, aggregations, ordering, and pagination for supported source schemas. Preserve raw JSONB strings and codes, explicitly parse numerical values and units, and fail clearly for unsupported column definitions. Derive initial mappings by inspecting representative loaded rows for tourist-flats, population, incasol, and ine-59061.
- Return dataset/resource keys, immutable snapshot IDs, sha256, original resource URL, fetch/last-seen timestamps, observation periods, row numbers, units, and query arguments. Pin each query to an explicit snapshot, using latest_snapshot only to choose it when no version is requested. Expose a development catalogue API/view so the integration is verifiable before research wiring.

## Implementation Notes

Depends on TASK-002; follow the execution order in .viktor/tasks.json. Read .viktor/architecture.md and the existing README.md, db/schema.sql, compose.yaml, and scripts/ingest.py.

Our team owns the query tools. db/schema.sql remains the existing schema baseline. Add reviewed additive SQL migrations under db/migrations when changes are needed and mirror them in Drizzle mappings. Docker init scripts only initialize empty volumes, so document how to apply later migrations to existing local volumes and Neon. Use the Executor connector for available Cloudflare/account tooling and connect a Neon MCP only if it materially helps execution.

## Validation

Start Docker, run ingestion on a small source subset, and query catalogue/rows through the local Worker. Repeat the subset load and verify stable snapshot identity for unchanged content. Run the same tools against Neon through a development Hyperdrive binding. Verify parameter rejection, no-embedding fallback, leading-zero codes, explicit snapshot lookup after a newer load, and technical connection failures. Standard type/build checks must pass.

## Completion Notes

When complete, set done to true in .viktor/tasks.json, append changes and actual validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Record external-access blockers explicitly.
