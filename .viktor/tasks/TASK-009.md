# TASK-009: Add replaceable topic collections and one structured-data connector

## Objective

Deepen research for housing, tourism, and municipal decisions/public spending.

## Milestone

M5: Barcelona source coverage. See the task index for the complete milestone sequence.

## Why

This capability advances the agreed text-to-assessment workflow in .viktor/specs/council-claim-checker.md.

## Requirements

- Create apps/api/src/research/sources.ts with editable topic/domain/source collections, including a general fallback. Verify current official pages and record source purpose and date of inspection.
- Add one structured-data adapter for a real accessible Barcelona dataset. Select it during implementation by verifying download/API access and field definitions; document metric, geography, period, units, licensing/source attribution, and missing values. Route applicable numerical claims to it.
- Expose fetched data rows as evidence and pass calculations through the existing validated tool. Distinguish missing coverage from technical failures.
- Seed relevant public-record/document entry points for all three topics. Claims outside those collections continue general research. Replacing a collection must require no UI or contract change.

## Implementation Notes

Depends on TASK-008; the ordered index assumes all earlier tasks are complete. All application paths are proposed additions. Read .viktor/architecture.md before implementing.

Use existing official-first search. Topic coverage is intentionally configurable. Do not assume legacy endpoint names from rough-plan.md are working until checked.

## Validation

For each topic, run one manually checked factual statement against a current official source. For the dataset adapter, reproduce one numerical comparison from retrieved rows. Replace a collection in a fixture and verify routing changes without breaking general fallback.

## Completion Notes

When complete, set done to true for this task in .viktor/tasks.json, append actual changes and validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Never mark validation complete when credentials or external access prevented it.
