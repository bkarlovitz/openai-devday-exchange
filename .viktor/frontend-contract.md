# Frontend handoff

The shared schemas in packages/contracts/src/runs.ts and claims.ts define the current response shape. The typed Effect client in packages/contracts/src/client.ts is shared by web and extension clients.

Development backend URL is https://council-checker-dev.snapnda.workers.dev. The same-origin web app can use relative URLs. Cross-origin frontend development can proxy /api to that backend. Extension CORS is covered by TASK-010.

## Submit text

POST /api/runs with Content-Type application/json.

Required fields are submissionKey (a caller-generated UUID) and text. Optional fields are explanationLanguage (en/es/ca), source (url/title/sessionDate), and passages (start/end/speaker/startSeconds). Passage offsets use UTF-16 indices into the original text, with end exclusive. Text is limited to 200,000 Unicode code points.

Keep the same key and payload when retrying after a lost response. Editing text creates a new key. Reusing a key for different content returns 409.

A successful response is HTTP 202 with runId and url. The web URL has the form /runs/{runId}.

## Read progress and claims

GET /api/runs/{runId} returns the following fields.

| Field | Shape |
| --- | --- |
| runId | UUID string |
| submission | The original validated submission |
| status | queued, awaiting_processing, extracting, processing, complete, or error |
| createdAt | ISO timestamp |
| revision | Increasing integer when state changes |
| extraction | Optional object containing attemptId, completedChunks, totalChunks, and done |
| detectedLanguage | Optional en/es/ca |
| explanationLanguage | Optional en/es/ca |
| error | Optional user-facing processing error |
| errorCount | Number of technically failed claims in a completed run |
| claims | Array of extracted claim records |

Claims appear as extraction chunks finish. Poll every two seconds during queued, extracting, and processing. Stop at complete or error. Completed runs may contain partial claim errors, reported by errorCount. An empty factual-claim list also completes successfully. Submitting an older extraction-only run with its same payload/key resumes checking without repeating extraction.

Each claim contains claimId, exact quote, standalone assertion, start/end source offsets, context, entities and dates arrays, nullable metric/place/comparison, optional speaker/startSeconds, and status. Claim states are awaiting_research, researching, assessing, complete, error, and not_checkable. Summary fields verdict, evidenceCount, and error are optional. Compound assertions can have different claim IDs that cite the same quote.

The original quote and context retain their source language. Explanation-language selection is accepted by the API; UI language switching is TASK-008.

[Example extracted run](examples/extracted-run.json) and [completed claim detail](examples/assessed-claim.json) are rendering fixtures captured from live checks.

## Claim details and assessments

GET /api/runs/{runId}/claims/{claimId} returns ClaimDetail, validated in packages/contracts/src/claims.ts.

- claim is the current summary.
- evidence is an array of retained source records.
- research is optional and contains the source-selection notes, topic, checkability, and evidence-sufficiency decision.
- assessment appears when checking completes.

The shared Effect API client exposes loadClaim(runId, claimId, signal). Reload details as the run revision changes. Shared React result components are exported by @council/ui for the web app and extension.

| Evidence field | Purpose |
| --- | --- |
| evidenceId, kind, title, sourceUrl | Citation identity, web/dataset/document type, and original source link |
| text | Retained original-language passage or structured-data provenance |
| retrievedAt, sourceDate | Retrieval timestamp and observation/source date when available |
| datasetId, resourceKey, snapshotId, sha256 | Immutable dataset provenance when applicable |
| rows, rowNumbers, query | Original retrieved rows and the query that selected them |
| totalRows, rowsAreSample, aggregate | Coverage information and exact full-match aggregates |
| pageNumber | Original document page when available |

Dataset raw JSON belongs in expandable details. Show the period and complete aggregate clearly alongside it. Sample rows alone cannot establish a whole-dataset total.

The Assessment schema is exported from packages/contracts/src/assessments.ts.

| Field | Shape |
| --- | --- |
| verdict | supported, contradicted, mixed_evidence, or insufficient_evidence |
| explanation | Short explanation in the selected language |
| evidenceIds | IDs referencing this claim's retained evidence |
| uncertainty | Array of explicit limitations or unresolved questions |
| calculations | Array containing operation, labelled/unit-bearing source operands, code-computed result, formula, and result unit |

Display verdict labels as Supported, Contradicted, Mixed evidence, and Insufficient evidence. Keep them separate from processing states. Calculations support difference, percentage_change, and sum, with source values and units checked in code.

## Errors and research scope

HTTP 400 indicates invalid input, 404 an unknown run or claim, 409 conflicting key reuse, and 503 a technical service failure. A run can enter error with its processing error and any claims already extracted. An individual claim can enter error while other claims finish. A technical failure is displayed separately from an insufficient-evidence assessment.

The initial research pass uses at most three application tool actions and two concurrent claim researchers. Automatic longer research passes and failed-stage retries are subsequent tasks.

## Transcript and checkability additions

Additive fields keep existing clients and text producers compatible:

- `Run.checkability?`: `{ kind: "factual_assertion" | "opinion_prediction" | "uncertain", explanation: string }`, an advisory short-passage classification separate from truth verdicts.
- `Run.extraction.warnings?`: explicit source-anchoring coverage warnings. Render them even if no claims are available; do not describe a warned empty extraction as proof that the input contains no facts.
- `Claim.occurrences?`: `[{ start, end, speaker?, startSeconds? }]`, exact original UTF-16 offsets. Canonical claim IDs and completed results remain stable as occurrences append.

Extraction and claim checking now overlap. A run with finished current claims and `extraction.done=false` is still processing and can publish more claims. Both clients should continue polling until terminal run status. YouTube ingestion should send text/source/passages through the existing POST `/api/runs`; no transport-specific contract is required.
