# Task log

### TASK-001: Scaffold the workspace and run a persisted text submission

- **Timestamp** 2026-11-21T11:49:03.983009+00:00
- **Outcome** done
- **Summary** Added the strict TypeScript/npm workspace, React/Vite submission UI, Hono/Effect API, Effect Schema contracts, coordinator-owned run state, R2 storage, and an Alchemy-provisioned scaffold Workflow. Adopted engineering standards v0.1.1 with pinned source receipts and reference-source configuration. Preserved the Python/PostgreSQL data component.
- **Validation** npm install, typecheck, lint/format checks, and web/Worker dry-run build passed. Alchemy local smoke ran with real emulated R2, SQLite Durable Object, and Workflow bindings. Browser checks passed for submit, visible empty-text validation, exact saved text, reload, and mobile layout. API checks passed for concurrent duplicate requests, replay after a lost response, unchanged timestamp/revision, conflicting key reuse (409), missing IDs (404), optional metadata, 200,000-character Unicode input, and oversized rejection. The configured Vitest runner has no unit test files at this milestone. Vendor sync/status passed for four important direct libraries.
- **Implementation choices** Alchemy 0.94.0 is pinned with compatibility date 2026-07-15 to match its emulator. A local-only emulator account identity permits credential-free local startup. Deployment setup is documented for a Cloudflare development account; cloud deployment was outside this task's local validation.

### TASK-002: Extract traceable claims and show them as processing progresses

- **Timestamp** 2026-11-21T12:10:06.743240+00:00
- **Outcome** done
- **Summary** Added schema-constrained Responses extraction, bounded paragraph chunks, immutable R2 checkpoints, attempt-checked coordinator publication, language detection, source offsets, metadata mapping, and progressive claim display. Exported shared API schemas/client and published .viktor/frontend-contract.md with a live rendering fixture.
- **Validation** Four focused extraction fixtures passed. Live English, Spanish, and Catalan runs returned exact source quotes and correct language detection. Opinion-only text completed with zero claims. Multi-chunk input preserved offsets and replay did not duplicate claims. Browser extraction, polling, and reload passed. Typecheck, lint, and web/Worker build passed. The deployed Cloudflare Workflow also completed a Catalan extraction.
- **Integration** Rebased work onto the teammate's merged B-path database/document additions before completing this task. Alchemy profile selection is configurable for the connected Cloudflare account.

### TASK-012: Connect the existing evidence database through Neon and Hyperdrive

- **Timestamp** 2026-11-21T12:10:35.318962+00:00
- **Outcome** done
- **Summary** Extended the teammate's database helper and Hyperdrive integration with Drizzle mappings, typed catalogue/inspection/query tools, immutable snapshot references, raw rows, explicit projections, pagination, and validated numerical aggregates. Preserved their document routes, ingestion scripts, migrations, and source-reference fixture.
- **Validation** Loaded Incasòl, one population resource, tourist flats, and INE locally and into Neon. Repeated ingestion preserved the Incasòl snapshot ID/hash. Local Worker checks passed for catalogue lookup without embeddings, field inspection, pinned queries, decimal aggregation, leading-zero codes, invalid-field rejection, absent snapshots, empty results, and suppressed/missing numeric values. A temporary newer snapshot confirmed pinned historical pagination, and the fixture snapshot was removed. A connection failure returned a technical DatabaseError. The deployed Worker queried Neon through Hyperdrive and reproduced the official 2026 Q2 Barcelona price-band rent of 1140.89 EUR/month. Typecheck/lint/build and reference-source status checks passed.
- **Development deployment** https://council-checker-dev.snapnda.workers.dev. Development evidence inspection is explicitly enabled for this deployment. Submissions and database credentials remain server-side. The general claim-to-evidence research path remains TASK-003.

- **Concurrent merge reconciliation** Integrated the later catalogue/IncAsòl and structured-source merges as well. Preserved GET catalogue inspection and POST query-dataset, including source-specific period, rent, population, capacity, INE unit/scale, and cursor fields. The source-specific adapters share the general snapshot query engine.
