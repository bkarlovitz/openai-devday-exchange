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
