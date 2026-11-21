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
| claims | Array of extracted claim records |

Claims appear as extraction chunks finish. Poll every two seconds during queued/extracting. In this milestone, processing with extraction.done=true means extracted claims await research. TASK-003 will extend progress polling to cover active research. The complete state currently also covers successful extraction with zero factual claims. Old saved submissions can have awaiting_processing without extraction metadata; submitting their same payload/key starts extraction.

Each claim contains claimId, exact quote, standalone assertion, start/end source offsets, context, entities and dates arrays, nullable metric/place/comparison, optional speaker/startSeconds, and status=awaiting_research. Compound assertions can have different claim IDs that cite the same quote.

The original quote and context retain their source language. Explanation-language selection is accepted by the API; UI language switching is TASK-008.

[Example extracted run](examples/extracted-run.json) is a frontend rendering fixture captured from the live development backend.

## Errors and next-stage results

HTTP 400 indicates invalid input, 404 an unknown run, 409 conflicting key reuse, and 503 a technical service failure. A run can separately enter status=error with its processing error and any claims already extracted. Retrying failed stages is TASK-006.

Current claim cards can render the assertion, quote, context, speaker/time, and awaiting-research state. TASK-003/TASK-004 introduce evidence and assessment response contracts. The agreed assessment content is a verdict, short explanation, cited passages or rows, calculations where relevant, and uncertainty. Verdict labels are Supported, Contradicted, Mixed evidence, and Insufficient evidence. The backend does not produce those assessments yet.
