# Two-person execution plan

Proposed assignments use Person A and Person B as placeholders. Both people can work after the shared scaffold lands.

## Work lanes

| Person | Primary ownership | Task sequence |
| --- | --- | --- |
| A | Application contracts, processing, research orchestration, web results, recovery, language switching | TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-006 → TASK-007 → TASK-008 |
| B | Evidence database, Python preparation, database/document tools, topic coverage, extension | TASK-012 → TASK-013 → TASK-009 → TASK-010 |
| Both | Complete system evaluation and development build verification | TASK-011 |

This split gives B the existing data work and extension, while A owns the processing path. Workloads can be reassigned after the first cited assessment.

## Start and handoffs

1. Together, review the architecture and agree on the submission/run/claim/evidence contracts and PostgreSQL tool signatures. A implements TASK-001 and commits the runnable scaffold. B can inspect existing source schemas and prepare sample data during that work.
2. A starts extraction in TASK-002 while B connects Docker/Neon and implements query tools in TASK-012. TASK-012 depends on the scaffold and defines its database tool inputs/outputs in a dedicated contract module.
3. TASK-003 joins extraction and database tools. A wires research and completes TASK-004 assessments. B can prepare PDF extraction and source mappings during this interval. TASK-013 completes against the working research path after TASK-004.
4. A proceeds with bounded research, recovery, long text, and language switching. B completes stored-document retrieval, validates topic coverage, and builds the extension against the shared API.
5. Both run TASK-011 after all feature tasks land. Validate retry and language controls in the extension after A's relevant tasks have merged.

## Task dependencies

Task specs contain explicit prerequisites. A task is ready when those prerequisites have landed. The JSON index remains a valid single-worker execution sequence; parallel workers use this dependency graph and coordinate task claims.

| Task | Owner | Prerequisites |
| --- | --- | --- |
| TASK-001 | A | None |
| TASK-002 | A | TASK-001 |
| TASK-012 | B | TASK-001 |
| TASK-003 | A | TASK-002, TASK-012 |
| TASK-004 | A | TASK-003 |
| TASK-005 | A | TASK-004 |
| TASK-006 | A | TASK-005 |
| TASK-007 | A | TASK-006 |
| TASK-008 | A | TASK-007 |
| TASK-013 | B | TASK-004 |
| TASK-009 | B | TASK-013 |
| TASK-010 | B | TASK-004 |
| TASK-011 | Both | TASK-008, TASK-009, TASK-010 |

TASK-010 can start before TASK-009 if B prefers to establish the extension sooner. Its final retry and language integration is checked in TASK-011.

## Shared files and integration

Use a separate branch or worktree per person. Claim the task in a team message before starting and merge the prerequisite work before dependent integration.

A owns packages/contracts/src/api.ts, the shared API client, RunCoordinator, Workflow orchestration, the tool registry, and shared claim components. B adds database/document contracts in dedicated modules and owns database schema mappings, migrations, preparation scripts, source collections, and extension files. B's tools return the agreed evidence shape; tool registration is coordinated with A.

B owns Hyperdrive/Neon additions in infrastructure after TASK-001. Coordinate edits to root package files, infrastructure, contract exports, README.md, and tasks.json. Reserve the next SQL migration number before writing it. A small interface change should be agreed and committed before its consumers are updated.

Each task updates its own spec completion notes. Coordinate updates to tasks.json and the shared completion log when merging. Two autonomous Viktor loops need an explicit task-claim mechanism before running concurrently; manual task assignment is sufficient for this two-person workflow.
