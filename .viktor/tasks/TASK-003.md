# TASK-003: Route claims with Decisions and retrieve official-source evidence

## Objective

Show research progress and inspectable evidence for each detected claim.

## Milestone

M2: Cited factual assessments. See the task index for the complete milestone sequence.

## Why

This capability advances the agreed text-to-assessment workflow in .viktor/specs/council-claim-checker.md.

## Requirements

- Implement services/decisions.ts using OpenAI Decisions for checkability and topic, retaining an uncertain/general route. Expose skipped opinions as non-checkable status. Keep probabilities out of factual verdict fields.
- Implement research/search.ts and research/read-source.ts with an application search_sources/read_source contract. Verify chosen Responses model supports web search, enforce supported built-in tool-call controls, and document request/response examples in README.md.
- Add evidence contracts and per-claim R2 writes. Run the bounded initial pass of one search and up to two reads. Preserve provenance, original-language excerpts, source date when available, and retrieval failures separately from empty search results.
- Render source links and retained passages in packages/ui/src/EvidenceList.tsx. Distinguish a verified source passage from an unavailable full text. Never present a generated summary as a source quotation.
- Add configurable official domain collections with a general official-first route. Allow wider-web expansion where helpful. Limit two simultaneous researchers and persist each claim independently.

- Add packages/contracts/src/evidence.ts and claim-detail/run-summary response schemas. Implement GET /api/runs/:runId/claims/:claimId and extend the typed client. Store evidence artifacts under attempt-specific keys and publish their references through RunCoordinator; reject stale attempts.

## Implementation Notes

Depends on TASK-002; the ordered index assumes all earlier tasks are complete. All application paths are proposed additions. Read .viktor/architecture.md before implementing.

Add research files under apps/api/src. This milestone completes after TASK-004 with real assessments. Model/account/tool compatibility is explicitly verified here; record any necessary Responses model substitution.

## Validation

Run a live Decisions request and a tool-enabled web search using configured models. In the app, check a fresh factual claim and inspect linked source content. Use fixtures to ensure a made-up quotation is rejected, uncertain routing still researches, and two claims publish evidence without overwriting each other.

## Completion Notes

When complete, set done to true for this task in .viktor/tasks.json, append actual changes and validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Never mark validation complete when credentials or external access prevented it.
