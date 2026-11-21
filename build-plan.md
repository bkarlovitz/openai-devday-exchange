# Barcelona council claim checker — build plan for discussion

A first working system could take a passage from a council session, find its numerical claims, and let a reader trace each check back to the original quote and official figures. One topic with a well-understood dataset would give us a manageable starting point.

## Proposed modules

| Module | Responsibility | Output |
| --- | --- | --- |
| Session intake | Read an existing transcript or use a speech model to transcribe a recording. | Original-language passages linked to the session, with timestamps and speakers where known. |
| Claim extraction | Use a language model to identify a numerical statement and what it measures. | A quoted claim with its metric, place, period, and any comparison period. |
| Evidence lookup | Find official figures that cover the claim’s definition, place, and period. | Source rows and a dataset link, or an explanation of what is missing. |
| Verification | Use code for reproducible calculations, such as percentage change between two quarters. | Claimed and calculated values, the calculation, and any limits on the comparison. |
| Reader client | Present the same check in a web app for browsing and sharing, or in a browser extension alongside the recording. | A view where a reader can inspect the quote and reproduce the check. |

These modules could live in one TypeScript project. React/Vite for the client, Effect for processing and shared data types, and Cloudflare for hosting are candidates from the [engineering standards](https://github.com/uwchlanventures/engineering-standards). Model selection could follow a small evaluation on actual Catalan and Spanish council passages, especially numbers, units, and speaker changes.

## Suggested build order

1. **Establish a reference check.** Choose a real passage and reproduce one claim by hand. Record the quote, official source, and calculation so the team has an expected result.
2. **Build the verification path.** Start with that manually entered claim and one dataset. Return a traceable comparison and exercise a case where the source covers the wrong period.
3. **Connect session intake and extraction.** Run a second passage through the modules together. Compare the extracted claims and calculations with a human reading to see where the system needs work.
4. **Connect the first client.** Choose the web app or extension around the reader’s workflow. The first version is working when a reader can follow a claim from passage to evidence and see why a check succeeded or remained unresolved.

## Questions for review

- Is the first reader investigating a completed session or checking claims while watching it?
- Is a timestamped transcript a useful first input, or does the first version need to accept a recording?
- Which topic has representative claims and an official source someone on the team can verify?
- Should the system assign a verdict, or present the comparison for a reviewer to assess?
