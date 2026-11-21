# TASK-004: Generate evidence-grounded verdicts and reproducible calculations

## Objective

Complete the first automatic checking path in the web app.

## Milestone

M2: Cited factual assessments. See the task index for the complete milestone sequence.

## Why

This capability advances the agreed text-to-assessment workflow in .viktor/specs/council-claim-checker.md.

## Requirements

- Implement services/assess.ts and research/calculate.ts. Return Supported, Contradicted, Mixed evidence, or Insufficient evidence plus explanation, evidence IDs, uncertainty, and original quote. Validate citation references before persisting.
- Use Decisions narrow relevance, scope, and conflict questions as inputs to assessment. Assess actual dates/definitions and distinguish approval or announcement from execution. Finalize unresolved initial-pass claims now; TASK-005 adds automatic deeper research.
- Use a validated arithmetic tool with named operations for differences, percentage change, and totals. Store operands, units, formula, and zero-baseline errors. No generated code execution.
- Add packages/ui/src/ClaimCard.tsx and AssessmentView.tsx to display verdict separately from processing status, original evidence, and calculations. Poll until each assessment completes.
- Mark a run complete only when all routed claims finish or are recorded as technical failures. Show partial results and an explicit error count.

- Add packages/contracts/src/assessments.ts and update the claim-detail endpoint/client to return validated assessment and calculation records. Move web rendering into packages/ui so the extension can reuse it later.

## Implementation Notes

Depends on TASK-003; the ordered index assumes all earlier tasks are complete. All application paths are proposed additions. Read .viktor/architecture.md before implementing.

Reuse source contracts from TASK-003. A source outage is a technical failure, whereas an unsuccessful evidence search can yield Insufficient evidence. Evidence summaries and explanations remain separate from retained quotations.

## Validation

Use human-reviewed fixture cases covering all four verdicts, a wrong-period source, approval versus completion, and a zero baseline. Verify calculation results exactly. Run a live short submission and click through its quote, sources, and explanation. Standard checks must pass.

## Completion Notes

When complete, set done to true for this task in .viktor/tasks.json, append actual changes and validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Never mark validation complete when credentials or external access prevented it.
