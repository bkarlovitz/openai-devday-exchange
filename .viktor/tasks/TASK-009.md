# TASK-009: Validate topic collections and stored-data comparisons

## Objective

Deepen research for housing, tourism, and municipal decisions/public spending.

## Milestone

M5: Barcelona source coverage. See the task index for the complete milestone sequence.

## Why

This capability advances the agreed text-to-assessment workflow in .viktor/specs/council-claim-checker.md.

## Requirements

- Complete apps/api/src/research/sources.ts with editable topic/domain/source collections, including a general fallback. Verify current official pages and record source purpose and date of inspection.
- Reuse the catalogue, typed dataset tools, and document retrieval from TASK-012 and TASK-013. Validate source-specific mappings and calculations for the loaded tourist-flats, population, Incasòl, and INE datasets. Document metric, geography, period, units, attribution, and missing-value conventions. Route applicable claims to the stored evidence.
- Expose fetched data rows as evidence and pass calculations through the existing validated tool. Distinguish missing coverage from technical failures.
- Seed relevant public-record/document entry points for all three topics. Claims outside those collections continue general research. Replacing a collection must require no UI or contract change.

## Implementation Notes

Depends on TASK-013; the ordered index assumes all earlier tasks are complete. All application paths are proposed additions. Read .viktor/architecture.md before implementing.

Use the existing ingestion pipeline and database research tools with official-first search. Topic coverage is intentionally configurable. Do not assume legacy endpoint names from rough-plan.md are working until checked.

## Validation

For each topic, run one manually checked factual statement against a current official source. Reproduce numerical comparisons from stored snapshot rows and verify document citations. Distinguish rental indices from euro rents and register snapshots from historical observations. Replace a collection in a fixture and verify routing changes without breaking general fallback.

## Completion Notes

When complete, set done to true for this task in .viktor/tasks.json, append actual changes and validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Never mark validation complete when credentials or external access prevented it.
