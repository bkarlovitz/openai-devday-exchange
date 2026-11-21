# TASK-013: Extract and retrieve citable passages from stored council documents

## Objective

Make stored official documents usable evidence alongside structured database rows.

## Milestone

M5: Barcelona source coverage. Together with TASK-009, this milestone lets a reader inspect topic-specific checks against stored rows and official document passages.

## Why

The pulled database and ingestion implementation provides versioned official data that the application should reuse.

## Requirements

- Add db/migrations/NNN_document_passages.sql using the next available migration number for source_document_passage rows keyed by snapshot_id and stable passage number, containing extracted original-language text, page or HTML location, and extraction version. Use ordinary PostgreSQL full-text or text search initially. Preserve source_document bytes.
- Add scripts/extract_documents.py and a compatible pypdf dependency to scripts/requirements.txt. Extract text page by page from stored PDF bytes and visible text from stored council HTML. Record extraction status/version per snapshot so empty or scanned documents are distinguishable from parser failures, and reruns replace only the same snapshot's derived passages transactionally.
- Keep processing in the standalone Python data-preparation path. Document running schema migrations in numeric order with an applied-migration ledger so each runs once against existing Docker volumes or Neon, followed by ingestion and document extraction. This evidence preparation does not change the application's text-submission boundary.
- Add research/query-documents.ts and Drizzle mappings for document passage lookup, scoped by dataset/snapshot and configurable topic collections. Search passages with language-appropriate settings or a multilingual text fallback; retain page numbers, source URL, snapshot hash, and quotation text.
- Supply search_documents/read_document_passage tool exports and coordinate initial-research registration with Person A. Render document/page citations through the existing evidence view. TASK-011 verifies deep-loop registration and budget accounting after TASK-005 and this task have merged. Keep Google Fact Check entries labelled as prior published checks and research their underlying sources when needed.
- Complete source collections for housing, tourism, and municipal decisions/public spending using accessible official entry points. State which council sessions/documents have actually been loaded. Discovering a landing-page link alone must not imply its linked document content has been ingested.

## Implementation Notes

Prerequisites — TASK-004. Proposed owner — Person B. See .viktor/team-plan.md for parallel execution and shared-file ownership.

Reuse source_document and extend it additively for extraction status. Include a publicly accessible text-based council document in validation. Report scanned/inaccessible documents as unavailable; OCR can be added when required by real inputs. pypdf extracts text from digital PDFs and has distinct limits for scanned images.

## Validation

Extract the stored sample minutes PDF and inspect a cited passage against its original page. Verify HTML text search and PDF page citations in the web app, en/es/ca search fixtures, idempotent re-extraction, changed snapshots retaining old passages, and visible unsupported/scanned/error states. A document claim should retrieve and cite a stored passage through the actual research path.

## Completion Notes

When complete, set done to true in .viktor/tasks.json, append changes and actual validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Record external-access blockers explicitly.

## Delivered hackathon verification

The initial stored-document path is live on Cloudflare and Neon. The sample council page and 31 October 2025 minutes are loaded and extracted; other linked documents are not implied to be loaded. A real provider-backed run checked file 25XF0640 and cited snapshot 6, passage/page 8 of the minutes. See the task log for local extraction/history checks and the final live run. Deep-loop registration remains part of TASK-005/TASK-011.
