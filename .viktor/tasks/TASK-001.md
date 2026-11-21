# TASK-001: Scaffold the workspace and run a persisted text submission

## Objective

Create a runnable web-to-Worker path that accepts text and reloads it by run ID.

## Milestone

M0: Runnable submission app. See the task index for the complete milestone sequence.

## Why

This capability advances the agreed text-to-assessment workflow in .viktor/specs/council-claim-checker.md.

## Requirements

- Create npm workspaces, strict TypeScript configs, and compatible dependencies for the agreed stack. Provision development Worker assets, Workflow binding, and R2 through tooling/infra/alchemy.run.ts. Review and merge the released engineering-standard starter without overwriting planning files.
- Add packages/contracts/src/runs.ts with submission validation and minimal run state. Build apps/api/src/index.ts, routes/runs.ts, and services/run-store.ts, backed by the coordinator and R2. POST /api/runs returns 202 and persists a submission; GET returns it. A scaffold Workflow marks the run awaiting_processing.
- Build apps/web/src/routes/index.tsx and routes/runs.$runId.tsx with a paste form and saved submission view, TanStack Router, and Effect Atom. Explain awaiting_processing in the scaffold UI.
- Add .env.example and ignored local secrets, required bindings, scripts dev/build/typecheck/lint/format/test/deploy:dev, and README.md setup instructions. Keep OPENAI_API_KEY server-side. Use a local bucket for local development.

- Create apps/api/src/coordinator/run-coordinator.ts and provision its Durable Object binding and initial migration in Alchemy. It owns mutable run state and deduplicated commands. Persist R2 artifacts separately. Use a client-generated submissionKey UUID in the POST contract, returning the existing run for duplicate identical requests and 409 for key reuse with a different payload. Test response-loss resubmission.

## Implementation Notes

Depends on None; the ordered index assumes all earlier tasks are complete. All application paths are proposed additions. Read .viktor/architecture.md before implementing.

The greenfield project needs one real request and storage path before AI work. All listed paths are new. Follow .viktor/architecture.md for repository layout and scripts.

## Validation

Run npm install, npm run typecheck, npm run lint, and npm run build. Run npm run dev, submit text, reload its URL, and confirm the saved text. Empty text must fail visibly. Perform an Alchemy local/dev binding smoke check before committing.

## Completion Notes

When complete, set done to true for this task in .viktor/tasks.json, append actual changes and validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Never mark validation complete when credentials or external access prevented it.
