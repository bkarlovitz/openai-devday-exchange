# TASK-006: Retry failed stages while preserving completed claim results

## Objective

Let a user recover from technical failures through the normal results page.

## Milestone

M3: Bounded deeper research. See the task index for the complete milestone sequence.

## Why

This capability advances the agreed text-to-assessment workflow in .viktor/specs/council-claim-checker.md.

## Requirements

- Implement POST /api/runs/:runId/retry, services/retry-run.ts, and a Retry action in AssessmentView/run page. Retry only technical failures and reuse completed extraction, evidence, and assessments. Scope attempt IDs per extraction or claim stage so retrying a failed claim preserves active siblings.
- Use stable attempt IDs and prevent duplicate retry requests or replay from starting conflicting writers. Serialize mutations per run. Preserve deep-research counters and deadlines across attempts; an expired budget proceeds to finalization.
- Expose errored extraction, failed claim research, and failed final explanation distinctly. Successful retry updates polling state and aggregate run completion.
- Persist compact stage references in Workflow outputs and retain partial R2 artifacts even when a provider or write fails.

- Add retry request/response Effect Schemas and typed-client methods. Implement coordinator commandId deduplication and deterministic attempt Workflow IDs. Validate stale-attempt publication is rejected and lost-response retries return the same attempt.

## Implementation Notes

Prerequisites — TASK-005. Proposed owner — Person A. See .viktor/team-plan.md for parallel execution and shared-file ownership.

Extend the existing store and Workflow rather than introducing a queue. Extend the RunCoordinator command and attempt protocol established in TASK-001.

## Validation

Inject extraction, research, and finalization failures separately. Retry via UI and verify other completed claims and IDs remain unchanged. Send duplicate retry requests and confirm one new attempt. Retry one failed claim while a sibling is researching and confirm both publish successfully. Prove an expired deep budget cannot be renewed through retry.

## Completion Notes

When complete, set done to true for this task in .viktor/tasks.json, append actual changes and validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Never mark validation complete when credentials or external access prevented it.

## Delivered hackathon scope

The user explicitly prioritized this recovery slice before TASK-005. Failed extraction and selected failed claims can restart independently; successful and active siblings remain intact. Existing research/evidence checkpoints are reused, command identities survive lost responses, and stale attempt publication is rejected. No budget keys are reset; TASK-005 must verify its future deep-budget expiry integration when that capability is introduced. Real extraction recovery completed35claims without technical errors; scoped claim recovery preserved32siblings.
