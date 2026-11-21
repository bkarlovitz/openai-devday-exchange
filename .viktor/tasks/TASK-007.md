# TASK-007: Process full text submissions with stable context and repeated-claim links

## Objective

Make accepted long transcripts and documents usable without losing factual context.

## Milestone

M4: Multilingual long-text checking. See the task index for the complete milestone sequence.

## Why

This capability advances the agreed text-to-assessment workflow in .viktor/specs/council-claim-checker.md.

## Requirements

- Extend services/chunk-text.ts from TASK-002 and integrate progressive extraction checkpoints. Accept up to 200,000 Unicode characters initially, configurable. Split by paragraph/sentence with bounded overlap and preceding context. Preserve global offsets and optional passage metadata.
- Extract progressively and combine repeated occurrences conservatively. Retain conflicting dates, numbers, or qualifiers as distinct assertions. Never silently truncate accepted text or cap claims.
- Update manifest ownership so extraction can append claim IDs while independent researchers save results safely. Expose extraction completion separately so an empty current queue does not prematurely complete a run.
- Display accepted-size feedback, extraction progress, repeated occurrences, and passage context in the web view. Oversized submissions receive an explicit API validation error.

## Implementation Notes

Depends on TASK-006; the ordered index assumes all earlier tasks are complete. All application paths are proposed additions. Read .viktor/architecture.md before implementing.

Use RunCoordinator manifest ownership and immutable per-claim artifacts from the architecture. Counting Unicode characters must be consistent between client and API. Explicitly retain every occurrence when deduplicating.

## Validation

Create a multi-chunk fixture with a claim at a boundary, a pronoun requiring preceding context, repeated statements, and a changed comparison period. Verify global quote offsets and no missing final paragraph. Submit a long text through the UI while earlier claims finish and ensure run completion waits for extraction.

## Completion Notes

When complete, set done to true for this task in .viktor/tasks.json, append actual changes and validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Never mark validation complete when credentials or external access prevented it.
