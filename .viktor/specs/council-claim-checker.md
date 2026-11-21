# Council claim checker

Requirements draft for review, based on the agreed planning interview. Architecture details remain open for implementation planning.

## Problem and goal

Readers need a way to check factual assertions in council debates and other text against inspectable evidence. Build a general text-based checker for numerical and broader factual claims, starting with Barcelona. It should accept new material across topics and explain both assessments and unresolved questions.

## User workflow

A user pastes text into the web app or selects text in the desktop Chrome extension and chooses “Check claims.” The extension opens a side panel with the submitted text, detected claims, per-claim progress, and results. It also supports pasted text and opening the same check in the web app.

Checking starts automatically after submission. Detected claims appear as they become available. Assessments appear independently as research completes. Each assessment shows the exact claim, a verdict, a short explanation, cited evidence passages, and uncertainty. Processing status is shown separately from the verdict.

English, Spanish, and Catalan input and explanations are supported. Explanations default to the input language, with a selector for those three languages. Evidence quotations retain their original language.

## System boundary

The checker accepts text regardless of how it was obtained. YouTube transcripts, PDFs, and audio-derived transcripts can be supplied as text by separate systems. The input interface should allow optional source references, speaker labels, and timestamps, while supporting plain text alone.

Both clients and external text producers use the same backend contract. The checker preserves the relationship between the submitted passage, extracted claim, evidence, and assessment.

## Checking modules

| Module | Required behavior |
| --- | --- |
| Text intake | Preserve submitted text and supplied source context. |
| Claim extraction | Use structured generative output to extract individual checkable assertions, exact quotes, and relevant entities, dates, quantities, and context. Distinguish factual assertions within opinions or predictions. |
| Fast decisions | Use OpenAI Decisions to classify checkability and topic and route research. After evidence retrieval, use narrow questions to evaluate relevance, coverage, and conflicts. |
| Evidence research | Start with official sources and public records, with wider-web search available where useful. Retain passages or data rows and source links. Check whether dates, geography, and definitions address the actual assertion. |
| Deeper research | Automatically investigate missing or conflicting evidence through further searches, document inspection, and source comparison. |
| Assessment | Ground explanations in retrieved evidence and use reproducible code calculations where appropriate. Preserve uncertainty and conflicting findings. |
| Processing and results | Retain intermediate work, expose per-claim progress, and let both clients access the same run and results. |

A decision model's confidence alone is insufficient grounds for a factual verdict. An official announcement must be assessed against what the claim asserts, such as approval, a promise, or completed delivery.

## Assessments

| Verdict | Meaning |
| --- | --- |
| Supported | Retrieved evidence supports the assertion within its stated scope. |
| Contradicted | Retrieved evidence contradicts the assertion. |
| Mixed evidence | Evidence supports some material aspects and contradicts others, or credible sources conflict. Explain the disagreement. |
| Insufficient evidence | Available evidence cannot establish an assessment, with the missing information explained. |

Failure to retrieve a source does not establish contradiction. A technical processing failure should remain visible as an error that can be retried.

## Research limits and specializations

The initial deeper-research budget is 60 seconds and 8 tool calls per claim. Stop when either limit is reached and finish with the available evidence and any unresolved questions. Keep these limits configurable. Exact tool-call accounting and timeout mechanics should be settled during implementation planning.

Start with source collections for housing, tourism, and municipal decisions/public spending in Barcelona. Keep these collections replaceable as priorities change. General research remains available for claims beyond those specializations.

## Engineering constraints

Build for one active user and rapid hackathon development. Follow the engineering standards as the stack direction, with a shared backend for the web app and extension. Keep operational complexity proportionate to this scope.

Audio transcription and source-file text extraction belong to upstream systems. This build focuses on checking supplied text. Model selection beyond OpenAI Decisions, persistence, background-processing runtime, and supported text-size limits remain planning choices.

## Proposed delivery milestones

1. Deliver automatic text submission, extraction, fast decisions, research, and cited assessments through the web app.
2. Handle longer submissions with preserved context and progress, then connect the extension to the same API and results.
3. Verify the complete workflow across the supported languages and initial topic collections.

## Acceptance checks

- Fresh text containing numerical and broader factual claims produces traceable assessments without manual claim selection.
- A reader can inspect the original quote and the evidence addressing it.
- Claims with missing or conflicting evidence trigger bounded deeper research and yield an explained outcome.
- Claim progress and completed assessments appear progressively in both clients.
- A selected-text extension check can be opened as the same run in the web app.
- Plain text succeeds without speaker labels or timestamps.
- Supported languages, verdicts, calculations, and quoted passages are checked against a small human-reviewed set.
