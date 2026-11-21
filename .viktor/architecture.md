# Implementation plan

This document supplies implementation defaults for the [agreed specification](specs/council-claim-checker.md). These defaults were selected during task planning and can be revised. All application paths below are proposed new files in this greenfield repository.

## Runtime and stack

Use npm workspaces with apps/web, apps/api, apps/extension, packages/contracts, packages/ui, and tooling/infra. The Worker serves the web assets and Hono API on one origin. A Cloudflare Workflow runs processing independently of browser requests. Alchemy provisions the Worker, Workflow binding, a per-run RunCoordinator Durable Object binding, and private R2 bucket. Isolate tooling dependencies if Alchemy and the application require different Effect versions. Follow the company stack for strict TypeScript, Effect, Effect Schema, Effect Atom, TanStack Router, Tailwind, shadcn/ui, Oxlint/Oxfmt, Vitest, and Playwright. R2 stores document-shaped artifacts. RunCoordinator owns mutable progress and command state in Durable Object storage, keeping coordination inside the Cloudflare deployment.

Choose compatible package versions and commit the lockfile during TASK-001. That task also installs the applicable released engineering-standard starter files, preserving existing planning files. Document local development commands and required bindings.

Cloudflare Workflows supplies checkpointed steps and configurable retries. Store large results in R2 and pass references between steps. Verify compatibility using the chosen Alchemy version during scaffold implementation. [Workflow retries](https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/), [Workflow limits](https://developers.cloudflare.com/workflows/reference/limits/), [Alchemy Workflow resource](https://alchemy.run/providers/cloudflare/workflow/)

## Input and API

POST /api/runs accepts text, optional source metadata and context passages with offsets into the supplied text, optional explanationLanguage (en/es/ca), and a required client-generated UUID submissionKey. The shared client generates and retains the key until it gets a response. Repeating a key and identical payload returns the existing run; a different payload with the same key returns 409. Derive the run ID from that UUID and use it to address RunCoordinator, which records the submission and launches a deterministically named Workflow idempotently. Return 202 with runId and URL. Client-supplied source metadata is optional and carried through without invoking source extraction.

Proposed initial input limit is 200,000 Unicode characters, configurable and visible in both clients. Reject larger bodies explicitly. Empty text produces a validation error. Initial extraction chunks target 8,000 characters and 500 characters of context overlap, preferring sentence/paragraph boundaries and allowing configuration. Extraction processes the entire accepted submission without a hidden claim cap.

GET /api/runs/:runId returns submission metadata, detected language, extraction progress, claim summaries, and run state. GET /api/runs/:runId/claims/:claimId returns the full claim and assessment. POST /api/runs/:runId/retry retries technically failed processing stages. Translation failures are retried through the language command. POST /api/runs/:runId/language changes explanation language using existing evidence. Both mutations accept a commandId UUID for deduplication and return progress that clients can poll. Invalid IDs return 404. RunCoordinator serializes mutations per run. Retry starts a new deterministic attempt only for failed work, preserving completed artifacts. Attempt IDs are scoped to extraction or an individual claim stage, so retrying one claim cannot invalidate active sibling claims.

Poll every two seconds while processing or requested-language generation is active. Run summary includes revision, desiredLanguage, languageRevision, and explanation state, independently of processing status. A language command restarts polling even for a completed run. Refreshing the page reconstructs the view from persisted state.

## Records and state

Use Effect Schema contracts exported from packages/contracts/src/index.ts.

- Submission stores original text, optional URL/title/session date and passage context, and explanation language.
- Claim stores a stable ID, exact quote, original-text offsets, relevant context, structured assertion, and repeated occurrences.
- Evidence stores URL, title, retrieved date, source date when known, original-language passage or data rows, and calculation inputs where relevant.
- Assessment stores the four verdicts, explanation, cited evidence IDs, uncertainty, and any calculation.
- Run stores stage status and claim IDs. Claim progress stores queued/researching/complete/error and budget usage. Verdicts are separate fields.

RunCoordinator storage contains the run manifest, immutable submission reference, accepted claim-artifact references, command IDs, current attempt IDs, and language revisions. R2 keys use runs/{runId}/submission.json and immutable stage/claim artifacts under attempt-specific paths. Each Workflow publishes references through coordinator RPC with its attempt ID; stale attempts are rejected. Only the coordinator updates visible progress. It persists command intent before creating a Workflow whose deterministic ID lets a retry discover an already-created instance.

The primary Workflow is the processing writer. Extraction publishes claim IDs before research fan-out. Each claim stores its own immutable result, published independently through the coordinator. Workflow steps use stable stage names and persist small references so replay reuses completed artifacts. Language generation writes separate per-language explanation artifacts and cannot overwrite evidence or assessments. It publishes only for the active language revision. Old generations can be retained as cache entries but cannot change the selected language or its visible result.

RunCoordinator RPC and command deduplication are established in TASK-001 and extended by the retry and language tasks. This adds one platform primitive to resolve shared-state mutations without a separate database service.

Errors stay errors. Unsupported/no-result evidence can yield Insufficient evidence. A failed provider or store call is a technical error with a retry path. A run can finish with partial errors while other claims remain available.

## Models and research

Use configurable model IDs. Initial defaults are gpt-5.4-mini for extraction, research planning and explanations, gpt-6.2-astra for hosted web search, and gpt-6-luna for Decisions. Keep EXTRACT_MODEL, RESEARCH_MODEL, SEARCH_MODEL, EXPLAIN_MODEL, and DECISION_MODEL independently configurable. Confirm account access and a successful tool-enabled Responses request in TASK-003. Select another supported Responses model if compatibility or the three-language evaluation requires it and record the reason.

Decisions handles checkability/topic routing and narrow evidence-sufficiency questions. Responses handles schema-constrained extraction, tool requests, and explanations. [Decisions guide](https://developers.openai.com/api/docs/guides/decisions), [candidate Responses model](https://developers.openai.com/api/docs/models/gpt-5.4-mini)

Use an application-controlled research loop with search_sources, read_source, and calculate tools. search_sources calls Responses web search and retains source provenance. read_source retrieves accessible HTML/text or structured data, using a Workers-compatible parser. A source that only has an inaccessible PDF can be researched through a usable official text rendition or remain unresolved. Source-document ingestion can be extended independently.

Search prioritizes configurable official domain collections and can expand to the general web. A search citation supplies a source location. Displayed quotations must be checked against retained source content or an explicitly returned source excerpt. Missing text remains visibly unavailable. [Responses web search](https://developers.openai.com/api/docs/guides/tools-web-search)

## Budgets and correctness

Initial evidence research gets one search and up to two source reads per claim. If evidence is missing or conflicting, deeper research gets 60 seconds and eight application tool invocations, whichever ends first. Count searches, reads, and calculations, including failed invocations. One search invocation is one bounded provider request with max_tool_calls set to 1. Include any provider-internal search usage in diagnostics and test the cap during TASK-003. Budget bounds the application's research actions rather than an unspecified number of internal search-engine operations.

Use coordinator-owned budget reservations, with an attempt ID on every action. Set a persisted deeper-research deadline when that stage starts. Reserve each action before execution, pass the remaining deadline into abortable calls, and disable SDK/Workflow automatic retries for that bounded stage. Retry of a failed deep stage retains its remaining budget. Initial routing and final explanation are outside that research budget, each with an explicit request timeout. Final explanation gets 30 seconds initially. Timeouts there surface as retriable technical errors.

Use at most two claim researchers concurrently initially. Preserve evidence already gathered on exhaustion, then finalize an assessment. Failure to find evidence alone cannot contradict a claim. Verify every cited evidence ID. Arithmetic uses validated numerical operands and named operations, with the formula and inputs retained. Never execute generated code.

## Languages, clients, and validation

Detect the submission language with extraction and default explanation language accordingly. An explicit selector wins. Language switching regenerates explanations from retained evidence while preserving verdicts, calculations, and original quotations. In-flight processing always publishes its language-neutral assessment; the coordinator schedules explanation generation for the latest desired language. A failed translation is retried through the language command without rerunning research. Replaying a commandId recovers that command outcome. Deliberately retrying a failed translation uses a new commandId for the same desired language.

Both clients use the shared React claim/evidence components and Effect Atom API state. Chrome MV3 declares contextMenus and uses a selection context-menu action to open the side panel from a user gesture. Transfer selected text and page URL/title through extension messaging. The panel communicates directly with the API. Restrict host permissions and API CORS to configured web/dev origins and the installed extension ID. API keys stay server-side.

Proposed scope omits accounts for this one-user build. Keep result storage private behind the API and use random unguessable run IDs. Anyone with a run link can access its results, which is a deliberate hackathon tradeoff.

Validate quote offsets, multilingual extraction, evidence attribution, timeout accounting, partial failure/retry, long text, and extension-to-web run identity. Use deterministic fixtures for logic and a small human-reviewed live-source evaluation. Deploy only to a development environment to verify the build.

## Environment and verification commands

TASK-001 establishes npm run dev, build, typecheck, lint, format, test, and deploy:dev. TASK-010 adds build:extension. TASK-011 adds eval and test:e2e. Developer configuration supplies Cloudflare account/development credentials, OPENAI_API_KEY, model IDs, research limits, API and web origins, extension ID, R2/Workflow/coordinator bindings, and Alchemy stage settings. List actual variable names and secret-loading instructions in .env.example and README.md when provisioning is implemented. Commit no secret values.

TASK-001 should be runnable without OpenAI credentials. AI milestones require an account with Decisions and the selected Responses tools. Development deployment verification requires Cloudflare access. These are execution prerequisites, checked during the relevant tasks rather than assumed to have passed during planning.
