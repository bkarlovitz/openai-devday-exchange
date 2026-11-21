# TASK-002: Extract traceable claims and show them as processing progresses

## Objective

Turn submitted text into visible, timestamp-aware factual assertions.

## Milestone

M1: Automatic claim detection. See the task index for the complete milestone sequence.

## Why

This capability advances the agreed text-to-assessment workflow in .viktor/specs/council-claim-checker.md.

## Requirements

- Add packages/contracts/src/claims.ts and services/extract-claims.ts, services/openai.ts, and workflows/check-run.ts under apps/api/src. Expand run state to extracting/processing/complete/error and persist stable claim IDs and extraction artifacts.
- Use Responses schema-constrained output with Effect Schema validation. Preserve exact quote and source offsets, assertion context, dates/entities, supplied speaker/time metadata, and detected en/es/ca language. Validate quotes against source text before publishing.
- Render detected claims and extraction progress in the run page. Poll through apps/web/src/state/run.ts and handle no checkable claims as a successful empty result. At this milestone claims can remain awaiting_research.
- Add configurable model settings and 30-second extraction request timeout per chunk. Persist a failure visibly. Configure Workflow steps so replay reuses saved extraction instead of adding duplicates.

- Create packages/contracts/src/api.ts and packages/contracts/src/client.ts for submission and run-summary schemas and a reusable typed fetch client. Extension and web reuse this client. Add basic bounded paragraph chunking now in services/chunk-text.ts so all accepted input is handled; TASK-007 improves context, deduplication, and pipelining.

- Publish extraction and claim progress via RunCoordinator RPC, including the active attempt ID. Add global source-offset mapping from the first chunked extraction. Test a multi-chunk submission before this task completes.

## Implementation Notes

Depends on TASK-001; the ordered index assumes all earlier tasks are complete. All application paths are proposed additions. Read .viktor/architecture.md before implementing.

Extend TASK-001 endpoints and Workflow. Keep source offsets anchored to immutable original text. Test malformed structured output rather than trusting provider output.

## Validation

Run standard checks and a Vitest fixture for compound assertions, an opinion with an embedded fact, missing metadata, and invalid model quote. With a live API key, submit English, Spanish, and Catalan short texts and inspect exact quotes and language detection in the app.

## Completion Notes

When complete, set done to true for this task in .viktor/tasks.json, append actual changes and validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Never mark validation complete when credentials or external access prevented it.
