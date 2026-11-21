# Council claim checker — working build plan

Working discussion draft. The checking flow and client experience below are agreed. Architecture details and build milestones remain proposals for review.

## Goal

Build a general tool that takes council-session content, identifies factual claims, researches relevant evidence, and presents an assessment that readers can inspect. Barcelona is the initial context. The system should handle new sessions and claims across topics, with coverage depending on the available evidence.

The agreed claim scope includes numerical claims and broader factual statements, such as whether a council approved a measure, a service opened, or an event occurred. Opinions and predictions may appear in the input. Extraction should identify the factual assertions that evidence can address.

Research should start with official sources and public records, with wider-web search also available. The tool can specialize in selected Barcelona topics or areas while retaining a general claim-checking workflow. Initial source collections cover housing, tourism, and municipal decisions/public spending. These topics can change later.

The agreed input boundary is text. A separate system can turn audio into text and submit it through the same interface as any other text source. A proposed input contract would accept plain text with optional source references, speaker labels, and timestamps. Those additions could help readers trace claims back to their context.

Text can originate from a YouTube transcript, PDF, or another source. Upstream text extraction can evolve independently of the checker. English, Spanish, and Catalan are in scope. Both a web app and browser extension are intended clients. Plan for one active user and fast hackathon implementation.

Checking should start automatically once text is submitted. The intended approach is a fast first pass using a decision API, followed by longer agentic research passes as needed. OpenAI Decisions is the agreed decision API. Deeper research should run automatically when evidence is insufficient or conflicting, within a bounded per-claim research budget. The configurable initial deeper-research budget is 60 seconds and 8 tool calls per claim, stopping when either limit is reached. Each assessment should show a verdict, short explanation, cited evidence passages, and uncertainty.

## Existing data work

The repository includes Docker PostgreSQL/pgvector, versioned official-source tables, and a standalone Python ingestion pipeline. Our team owns integration and query tools. Use Docker locally and Neon through Hyperdrive for deployed queries. Reuse the loaded housing, tourism, population, and rental-index sources, then add searchable passages from stored council documents. Preserve the text-only submission boundary.

## Proposed modules

| Module | Responsibility |
| --- | --- |
| Text intake | Accept text from a client or another system, preserve the original wording, and retain any supplied source references, speaker labels, or timestamps. |
| Claim extraction | Identify checkable assertions and retain their exact wording and context. Capture relevant people, organizations, actions, places, dates, and any quantities or comparisons. Split compound statements into assertions that can be assessed individually. |
| First-pass decision | Use OpenAI Decisions to classify checkability and topic and route claims to research. After evidence retrieval, evaluate whether another research pass is needed. |
| Evidence research | Start with official datasets, council records, and public documents. Search the wider web where useful. Retain relevant passages or data rows with source links, and check dates, definitions, and scope. Topic-specific source knowledge and connectors could deepen coverage in selected Barcelona areas. |
| Assessment | Evaluate how the evidence supports or contradicts the assertion, perform calculations where relevant, and return a verdict, short explanation, cited evidence passages, and uncertainty. Verdicts are Supported, Contradicted, Mixed evidence, and Insufficient evidence. Processing states are displayed separately. |
| Processing and storage | Coordinate longer processing runs, retain intermediate results and evidence, and expose progress and completed checks through a shared API. |
| Web client | Submit content, browse claims, inspect evidence, and share results. |
| Browser extension | Bring the same checking workflow into the page someone is reading or watching. The agreed interaction is selecting text and choosing “Check claims” to open results in a side panel. A paste-text fallback supports text from external producers. |

A proposed flow is text → claims → fast decision pass → deeper agentic evidence research as needed → assessment → results in either client. Both clients and external text producers would use the same backend input contract.

Research could combine a shared search capability with curated source lists and dataset connectors for selected topics. Assessments should explain how each source bears on the claim, including the distinction between an official announcement and evidence that the announced action happened.

## Agreed checking flow

1. **Extract claims with a generative call.** Use structured output to preserve quotes and context and separate individual assertions.
2. **Route with Decisions.** Classify checkability and topic to choose useful sources. Show extracted claims with a pending status as they become available.
3. **Retrieve initial evidence.** Search official sources and public records first, expanding to the wider web where helpful.
4. **Assess evidence sufficiency.** Use Decisions for narrow questions about relevance, coverage, and conflicts. A model's confidence alone would be insufficient grounds to publish a factual verdict.
5. **Research further automatically.** An agent can refine queries, inspect documents, and compare sources when evidence is missing or conflicting. Bound elapsed time and tool calls per claim. When the budget expires, retain available evidence and explain what remains unresolved.
6. **Publish cited assessments progressively.** Generate explanations grounded in retrieved passages and retain numerical calculations. Each claim can complete independently.

OpenAI Decisions supports typed predicate, choice, and score answers. Its documentation directs custom-schema extraction and explanations to Responses. Use a direct OpenAI integration for the hackathon. [OpenAI Decisions guide](https://developers.openai.com/api/docs/guides/decisions)

## Agreed client experience

In the extension, a reader selects a passage and invokes “Check claims.” Show the submitted text and detected claims in a side panel, followed by per-claim progress and cited assessments. Keep the surrounding page available for reading. Include a paste-text fallback for content supplied by other systems. Desktop Chrome is the initial browser target. [Chrome side panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)

The web app supports pasted text and the same progress and evidence views. Both clients reference the same processing run, so a reader can open an extension check in the web app. Page-wide extraction could follow once its behavior is defined.

## Architecture and models to discuss

The TypeScript workspace will contain clients, backend, and shared contracts alongside the existing Python data-preparation scripts. The engineering standards provide the starting direction for React/Vite, Effect and Effect Schema, Hono, Cloudflare Workers, Alchemy, and storage where needed. Implementation defaults use Cloudflare Workflows for research, a coordinator and R2 for run state/results, and Neon/Hyperdrive with Drizzle for stored evidence. [Engineering standards](https://github.com/uwchlanventures/engineering-standards)

A language model with structured outputs could extract claims, while tool-enabled model calls could research evidence and interpret definitions. A proposed assessment step would use model reasoning grounded in retrieved passages for broader factual statements, with code performing arithmetic where needed. Each assessment would retain the supporting evidence and explanation. Specific models should be chosen against representative text inputs and the available hackathon budget.

The main records would be text submissions, source passages, claims, evidence items, assessments, and processing runs. Their purpose is to preserve the connection between the original text, what was checked, and how the result was reached.

## Proposed build order

1. **Agree on the workflow and contracts.** Define the text input contract, expected assessments, and the first client interaction. Define the shared records and module interfaces so work can proceed independently.
2. **Make automatic checking work.** Connect text submission, extraction, the first-pass decision, deeper research, and assessments through the API and a usable web results view. Validate with varied claims across topics, including cases with insufficient evidence.
3. **Handle longer text submissions.** Preserve context across passages, combine repeated claims, and expose processing progress so a user can submit a full transcript or document and inspect its claims. Retain source metadata when supplied.
4. **Connect the browser extension.** First review the supplied [side-panel HTML and PDF design](docs/design/README.md), map its layout onto real input, progress, verdict, evidence, and error states, then build the panel against the shared API and result components. Prioritize the main layout and interactions for the hackathon. The extension and web work can proceed alongside backend work once the contracts are agreed.
5. **Verify the complete system.** Exercise fresh numerical and broader factual claims, check quotes and source links, verify that cited passages address the assertion, reproduce calculations, and check handling of conflicting or insufficient evidence.

## Hackathon engineering scope

Design for one active user. Favor a simple deployment, minimal configuration, and direct integrations. Keep validation focused on evidence accuracy and completion of the user workflow. Retain enough processing state to diagnose failures and rerun a failed stage. Production operations, extensive access controls, and large-scale resilience can be revisited as needs emerge.

## Planning with yook

Use yook's requirements interview to resolve the questions below and capture the agreed scope in a specification. Once reviewed, use its plan-work workflow to turn that specification into ordered milestones and implementable tasks with clear completion checks. Scale task detail and verification to the hackathon. This draft is the discussion input for that process.

## Specification

The agreed requirements are captured in [.viktor/specs/council-claim-checker.md](.viktor/specs/council-claim-checker.md). Explanations default to the input language, with an English/Spanish/Catalan selector. Quoted evidence retains its original language.

Implementation defaults and their rationale are in [.viktor/architecture.md](.viktor/architecture.md). They include the background runtime, storage, model configuration, text-size limit, and coordination of progress and retries. These defaults were selected during planning and remain reviewable.

## Implementation tasks

The ordered executable index is [.viktor/tasks.json](.viktor/tasks.json). Every task file includes requirements, dependencies, implementation paths, and validation.

| Task | Milestone | Deliverable |
| --- | --- | --- |
| [TASK-001](.viktor/tasks/TASK-001.md) | M0: Runnable submission app | Scaffold the workspace and run a persisted text submission |
| [TASK-002](.viktor/tasks/TASK-002.md) | M1: Automatic claim detection | Extract traceable claims and show them as processing progresses |
| [TASK-012](.viktor/tasks/TASK-012.md) | M2: Cited factual assessments | Connect the existing evidence database through Neon and Hyperdrive |
| [TASK-003](.viktor/tasks/TASK-003.md) | M2: Cited factual assessments | Route claims with Decisions and retrieve official-source evidence |
| [TASK-004](.viktor/tasks/TASK-004.md) | M2: Cited factual assessments | Generate evidence-grounded verdicts and reproducible calculations |
| [TASK-005](.viktor/tasks/TASK-005.md) | M3: Bounded deeper research | Automatically investigate unresolved and conflicting claims |
| [TASK-006](.viktor/tasks/TASK-006.md) | M3: Bounded deeper research | Retry failed stages while preserving completed claim results |
| [TASK-007](.viktor/tasks/TASK-007.md) | M4: Multilingual long-text checking | Process full text submissions with stable context and repeated-claim links |
| [TASK-008](.viktor/tasks/TASK-008.md) | M4: Multilingual long-text checking | Switch explanation language using retained evidence |
| [TASK-013](.viktor/tasks/TASK-013.md) | M5: Barcelona source coverage | Extract and retrieve citable passages from stored council documents |
| [TASK-009](.viktor/tasks/TASK-009.md) | M5: Barcelona source coverage | Validate topic collections and stored-data comparisons |
| [TASK-010](.viktor/tasks/TASK-010.md) | M6: Chrome extension client | Check selected text and open shared results in a side panel |
| [TASK-011](.viktor/tasks/TASK-011.md) | M7: Verified development build | Evaluate complete checks and verify the deployed clients |

Existing task IDs are preserved. Execute in task-index order, which places database integration before evidence research and document retrieval before source-coverage validation.

## Two-person execution

[The team execution plan](.viktor/team-plan.md) assigns application processing to Person A and evidence integration plus the extension to Person B. Explicit task prerequisites enable parallel work after the scaffold. Both people finish with full-system verification. Assignments are proposed and can be swapped.

## Current time-boxed delivery

The current hackathon build prioritizes the deployed text-to-cited-verdict web flow, the selected-text Chrome extension using the supplied design, and a real end-to-end check on Cloudflare and Neon. The extension is distributed as an unpacked ZIP. Longer research loops, stage-level retries, advanced long-text handling, language switching, broader coverage, and extra visual polish stay in the task backlog. Completed task status is recorded in the task index; this delivery scope does not imply that the entire roadmap is complete.
