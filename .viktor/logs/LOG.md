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

### TASK-003: Route claims with Decisions and retrieve official-source evidence

- **Timestamp:** 2026-11-21T12:45:00Z
- **Outcome:** done
- **Summary:** Added live OpenAI Decisions routing, official-first web discovery and exact retained passages, snapshot-pinned dataset planning/querying, per-claim immutable evidence, claim-detail API, and two concurrent checkpointed researchers. Fast decisions are advisory and checkability is independent of truth. Preserved the team's aggregate and document contract changes.
- **Validation:** Live Decisions and hosted web-search calls succeeded. A fresh Barcelona-capital claim produced a supported verdict from the official BOE statute with mechanically retained source text. Direct Incasòl research produced separate snapshot-pinned evidence for two simultaneous claims; population/tourism route planning and catalogue discovery were exercised during implementation. Focused source/decision fixtures passed. Technical failures remain distinct from empty evidence. The deployed Worker retrieved Neon evidence through Hyperdrive and rendered linked evidence in a browser without page errors.
- **Models:** Extraction/planning/assessment gpt-5.4-mini, Decisions gpt-6-luna, hosted search gpt-6.2-astra; model bindings remain configurable. Request examples and controls are in README.md.

### TASK-004: Generate evidence-grounded verdicts and reproducible calculations

- **Timestamp:** 2026-11-21T12:45:00Z
- **Outcome:** done
- **Summary:** Added citation-validated assessments, deterministic arithmetic with source/measure validation, progressive shared claim/evidence/assessment components, and explicit per-claim technical errors. Arithmetic correction has time to complete inside the workflow. Empty dataset rows cannot validate operands from query metadata.
- **Validation:** Typecheck, lint and all 22 focused tests passed, covering four verdicts, citation rejection, wrong periods, approval versus delivery, zero baseline, unit mismatch, arithmetic correction and empty-row metadata rejection. A live two-claim Catalan check marked 0.47% Supported and 50% Contradicted from 1135.55 and 1140.89 EUR/month; code computed 0.47025670379993356%. A fresh deployed check completed Supported against Neon; deployed web rendering passed without JavaScript errors. Retained live fixture: .viktor/examples/assessed-claim.json.
- **Review:** Independent focused review found and resolved the empty-row operand issue and the arithmetic-correction timeout mismatch; no additional critical persistence/stale-attempt issue was found. TASK-003/004 are integrated in one commit because their contracts and workflow form the first complete checking path under the user-approved hackathon time box.

### TASK-013: Integrate stored council passages into claim research

- **Outcome** implementation and local validation complete; live-provider validation pending.
- **Summary** For housing, tourism and municipal claims routed to public records, initial research now searches stored council minutes and reads up to two pinned passages. An empty search leaves one web search and one source read within the three-action budget. Evidence retains the passage and extraction version, and the shared results card links directly to the cited PDF page.
- **Local validation** Catalan, Spanish and English inputs about file 25XF0640 retrieved the exact original passage on page 8 from Docker PostgreSQL through the application research path with controlled model responses. Chromium rendered the resulting citation with the page anchor. Worker checks confirmed historical lookup after adding a newer fixture snapshot and distinguished empty/scanned, unsupported and error extraction states. Typecheck, lint, 22 tests and build passed.
- **Live provider** Local submission reached the workflow, but OpenAI extraction returned HTTP 401. The tracked task remains open pending successful live-provider verification.

### TASK-010: Check selected text and open shared results in a side panel

- **Timestamp:** 2026-11-21T12:52:00Z
- **Outcome:** done
- **Summary:** Added the MV3 Chrome extension with context-menu selection, automatic submission, paste fallback, tab-scoped persistent drafts/receipts, stable submission keys, transport retry, progress filters and shared cited assessment UI. Incorporated the supplied side-panel HTML/PDF design. Pinned the public extension identity and configured exact API CORS. Builds now publish a downloadable extension ZIP and install page with the web assets.
- **Validation:** Loaded the actual unpacked package in Chromium. Dispatched its registered selection event through Chrome, verified automatic live submission, Supported verdict, exact shared web-run link, and reload restoration with no page errors. A separate real Spanish paste check passed; switching between two tabs restored distinct runs. Expanded evidence rendered at 400px without horizontal overflow. Native browser context-menu UI clicking was not automated; the real registered handler and Chrome APIs were exercised. Typecheck, all 22 tests, lint and full extension/web/Worker build passed. ZIP inspection found no credential-like tokens or env files. Hosted ZIP bytes match the local artifact, install page loads, exact-origin preflight passes, and an unrelated origin receives no CORS permission.
- **Review:** Fixed the independently identified pending-submission tab-switch saving-state race before verification. Retry/language controls for future backend stages remain deferred with TASK-006/008; submission language and connection retries are available now.
- **Deployment:** https://council-checker-dev.snapnda.workers.dev with Neon through Hyperdrive. ZIP: /downloads/council-check-extension.zip. Install page: /extension-install.html.

### Hackathon delivery verification (subset of TASK-011)

- **Timestamp:** 2026-11-21T12:52:00Z
- **Outcome:** verified scoped build; full TASK-011 remains open
- **Summary:** Verified the deployed text-to-claim-to-evidence-to-verdict web and extension flow. The user time-boxed the deliverable to a hackathon build; TASK-005–009 remain follow-up tasks, as does complete roadmap evaluation. TASK-013 received live verification after the subsequent team merge, recorded below.
- **Evidence:** Live deployed numerical run aea1cfd9-2bbf-442f-9def-7421d908e12d (Neon snapshot → Supported). Extension English run 15fed423-b291-402e-a750-a4b28a0d8194 and Spanish paste run a785ce5a-0db8-46a1-8138-6732033de28b (official web passages → Supported). Desktop/mobile web and compact extension evidence rendering passed. Hosted ZIP SHA-256: 50093853b0e97838dbcc4e8e50bd2b9dc2d7dd252519b98683b136cba6686745. Native right-click menu UI and toolbar-icon clicking should receive a quick teammate smoke check in desktop Chrome.

### TASK-013: Live Neon and deployed document-citation verification

- **Timestamp:** 2026-11-21T12:56:00Z
- **Outcome:** done
- **Integration:** Pulled teammate commit ac5f5a4 (stored council research and page citations) before final delivery. Applied the existing additive migration and ledger to Neon, ingested only council/minutes, and extracted 31 council HTML passages (snapshot 5) and 21 minutes PDF passages (snapshot 6). The loaded minutes are the 31 October 2025 session; this is sample coverage, not a claim that linked sessions are loaded.
- **Validation:** The teammate's recorded local checks cover en/es/ca search, historical passages, extraction states and page rendering. Live deployed run d61010de-c2d4-4962-8123-a606567b1c40 checked the unanimous 1,040 EUR credit recognition for file 25XF0640. It completed Supported with no claim errors, citing retained Neon snapshot 6, passage/page 8, extraction version 1 and SHA-256 88d0fbd14b65d3bce2126401a3808081e614bcb8a82e9f5672082ee6fcfbcaf9. The deployed mobile web page rendered the source link ending #page=8 with no JavaScript errors. All 22 tests, typecheck, lint and full build passed after the merge.
- **Final deployed source:** ca60131aea3068dd8a4dae183e93ecdef823eee6. Final hosted extension ZIP bytes matched the local artifact; SHA-256: 83af6f05f29d39a535fff79f3e318411fdedbed7921d5530dca5d2a7c83831cf. The final documentation commit changes delivery records only. TASK-011 stays open for full-roadmap evaluation.
