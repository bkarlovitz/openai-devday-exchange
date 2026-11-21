# TASK-011: Evaluate complete checks and verify the deployed clients

## Objective

Finish with a working development build and a concise record of measured quality.

## Milestone

M7: Verified development build. See the task index for the complete milestone sequence.

## Why

This capability advances the agreed text-to-assessment workflow in .viktor/specs/council-claim-checker.md.

## Requirements

- Add a small human-reviewed evaluation set under eval/ spanning en/es/ca, all four verdicts, all initial topics, and a general-topic claim. Record expected quote/claim, source evidence, and assessment rationale without model self-grading.
- Add an eval command reporting extraction misses, unsupported quotes/citations, verdict agreement, and research-limit behavior separately. Record live-source retrieval dates and distinguish network/model errors from factual disagreements.
- Use Playwright for the web submission-to-result path with controlled provider fixtures, including partial failure/retry and language switching. Perform the extension manual smoke checks from TASK-010 with the deployed API.
- Run build/typecheck/lint/tests, deploy to a Cloudflare development environment with Alchemy, verify required secrets/bindings and browser CORS, and build an unpacked extension targeting that environment.
- Update README.md with exact local/dev commands, extension installation, model configuration, budget settings, known limitations, and evaluation results. Fix discovered blockers before marking this task complete.

- Include local ingestion, repeat loads, schema migration, document extraction, and deployed Neon-through-Hyperdrive retrieval in the final checks. Evaluate at least one stored-row numerical comparison and one stored-document factual claim. Record database and source versions with evaluation results.

## Implementation Notes

Depends on TASK-010; the ordered index assumes all earlier tasks are complete. All application paths are proposed additions. Read .viktor/architecture.md before implementing.

Keep evaluation focused on stated acceptance checks and single-user usage. This task creates no production release or store publication. Explicitly confirm environment access before reporting deployment verified.

## Validation

Run npm run typecheck, npm run lint, npm run test, npm run build, and the new evaluation command. Perform live deployed web and extension checks on fresh input with source inspection. Record measured results and any remaining accuracy limitations in completion notes.

## Completion Notes

When complete, set done to true for this task in .viktor/tasks.json, append actual changes and validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Never mark validation complete when credentials or external access prevented it.
