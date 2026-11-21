# TASK-005: Automatically investigate unresolved and conflicting claims

## Objective

Add the accepted longer agentic passes without hiding progress or exceeding the agreed budget.

## Milestone

M3: Bounded deeper research. See the task index for the complete milestone sequence.

## Why

This capability advances the agreed text-to-assessment workflow in .viktor/specs/council-claim-checker.md.

## Requirements

- Implement research/agent.ts and research/budget.ts. Use model-requested search_sources/read_source/calculate actions, validating arguments with Effect Schema. Automatically escalate missing or conflicting evidence after the initial pass.
- Persist a 60-second deadline and eight-action allowance per claim, configurable through environment settings. Reserve actions before calling tools and count failures. Use remaining-time abort signals and stop launching work on exhaustion.
- Disable automatic SDK and Workflow retries for the bounded research step. Keep final explanation outside the research window with a 30-second timeout. Preserve gathered evidence on budget exhaustion and finalize the best supported outcome, explaining remaining uncertainty.
- Cap built-in web-search calls per provider request and inspect usage fields. Test the real provider control chosen in TASK-003. Record application actions and provider search usage distinctly.
- Publish researching status and action counts to both run summaries and claim details. Ensure one stalled claim cannot prevent another claim publishing its assessment.

- Keep deadlines and action reservations in RunCoordinator storage. Every request carries a claim and active attempt ID, so replay cannot reset counters or allow stale writes. Configure Responses search max_tool_calls to 1 per search invocation.

- Count each search_catalogue, inspect_dataset, query_dataset, search_documents, or read_document_passage invocation against the same deeper-research budget once that tool is available. Use the remaining deadline for database statement/query timeouts and retain referenced snapshots.

## Implementation Notes

Depends on TASK-004; the ordered index assumes all earlier tasks are complete. All application paths are proposed additions. Read .viktor/architecture.md before implementing.

Use Workflow checkpoints around claim work. Persist budget state outside the replayable model/tool loop so restarts cannot reset allowances. Do not equate high classification confidence with evidential sufficiency.

## Validation

Use a fake clock and tool stubs to prove exactly eight actions maximum, timeout abortion, failed-action accounting, preserved evidence, and no hidden SDK retry. Test conflicts triggering research and sufficient evidence avoiding it. Live-test one unresolved claim and inspect measured budget usage.

## Completion Notes

When complete, set done to true for this task in .viktor/tasks.json, append actual changes and validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Never mark validation complete when credentials or external access prevented it.
