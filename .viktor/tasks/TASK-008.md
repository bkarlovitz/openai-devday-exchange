# TASK-008: Switch explanation language using retained evidence

## Objective

Support English, Spanish, and Catalan throughout the user workflow.

## Milestone

M4: Multilingual long-text checking. See the task index for the complete milestone sequence.

## Why

This capability advances the agreed text-to-assessment workflow in .viktor/specs/council-claim-checker.md.

## Requirements

- Add language selector state to the shared UI and POST /api/runs/:runId/language. Default to extracted submission language unless explicitly chosen at submission.
- Regenerate explanations and uncertainty text from retained assessment/evidence when switching language. Preserve verdict, original quote, source passages, and calculation data. Store per-language explanations to reuse completed translations.
- Serialize language mutation with retries and ongoing processing. New claims use the latest selected language, and existing completed claims expose translation progress and errors.
- Handle mixed-language input with the detected dominant language and explicit user override. Keep claim detail links stable across changes.

- Add language command and progress schemas to packages/contracts/src/api.ts and the typed client. RunCoordinator increments languageRevision, tracks desiredLanguage and per-claim explanation states, and rejects old-generation publication. Store translated explanations in separate artifacts. Replay of the same commandId returns its existing outcome; deliberate retry after translation failure uses a new commandId. Keep polling active until desired-language work finishes, even when checking is complete; validate rapid successive switches and a switch on an already-completed run.

## Implementation Notes

Depends on TASK-007; the ordered index assumes all earlier tasks are complete. All application paths are proposed additions. Read .viktor/architecture.md before implementing.

Add services/explanation-language.ts and shared language contracts. This task builds on the working research and retry paths rather than rerunning source searches to translate.

## Validation

Check the same run in all three languages and confirm only explanatory text changes. Test a language switch during active research and a failed translation retry. Verify source quotations, verdict values, and arithmetic remain identical.

## Completion Notes

When complete, set done to true for this task in .viktor/tasks.json, append actual changes and validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Never mark validation complete when credentials or external access prevented it.
