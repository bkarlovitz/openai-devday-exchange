# Wingman walkthrough

Use the working text-to-evidence path for a three-to-five-minute walkthrough. The input collection combines an authentic official-record excerpt with team-authored verification statements. Source versions and expected arithmetic are recorded with each input.

## Inputs and provenance

| Input | Authorship and source | What to inspect |
| --- | --- | --- |
| [Council credit excerpt](../eval/demo/council-credit-source.json) | Exact 503-character excerpt from the 31 October 2025 plenary minutes, page 8, item 25XF0640 | Approval of a €1,040 recognition of credit and unanimous adoption, with the original PDF/page citation |
| [Housing comparison](../eval/demo/controlled-housing-comparison.json) | Team-authored statements checked against public Incasòl rows | Barcelona municipality 08019, price band above €600/month, April–June 2025 and 2026. Compare a 0.47% statement with a 50% statement |
| [Payment coverage boundary](../eval/demo/missing-payment-coverage.json) | Team-authored statement about completed payment for 25XF0640 | The loaded minutes establish approval and recognition of an obligation. Evidence of completed payment would require a further record |
| [Long document input](../eval/demo/council-long-source.json) | Exact extracted text from minutes pages 8–11, with page offsets and the source hash | Optional long-input check. It contains 13,591 characters and multiple official resolutions |

The housing source rows have average monthly rent of €1,135.55 for Q2 2025 and €1,140.89 for Q2 2026 in the stated band. The calculation is `(1140.89 - 1135.55) / 1135.55 * 100 = 0.4702567…%`, rounded to 0.47%. Keep the municipality, band, periods, and units visible when presenting the comparison. [Official Incasòl dataset](https://analisi.transparenciacatalunya.cat/d/qww9-bvhh)

The document excerpt is drawn from the stored PDF with SHA-256 `88d0fbd14b65d3bce2126401a3808081e614bcb8a82e9f5672082ee6fcfbcaf9`. The current development database stores it as snapshot 6, passage 8. Snapshot IDs are local to the database, while the source URL and hash identify the underlying document. [Official minutes, page 8](https://ajuntament.barcelona.cat/sites/default/files/2025-12/CPlenari%2031-10-25-Acta.pdf#page=8)

## Recommended opening: checkability before truth

Start with [the opinion input](../eval/demo/opinion-checkability.txt): “I would prefer fewer tourist apartments in Barcelona.” The short-passage notice identifies opinion/prediction, with no factual verdict. Then open the controlled housing statements: both are fact-checkable, while their verdicts differ. This demonstrates why checkability and truth are separate decisions. Short-passage checkability is advisory and never suppresses claim extraction.

Ready-to-import `.txt` files accompany the JSON provenance records. Use the web import control or paste their text. The long source fixture is an authentic document excerpt, not a YouTube transcript. A teammate is independently building YouTube-link ingestion against the unchanged text-submission API.

## Before presenting

1. Open the [development app](https://council-checker-dev.snapnda.workers.dev) and the official minutes PDF on page 8.
2. Run the short authentic excerpt and the two controlled housing statements. Keep their actual result URLs available. They are completed runs with retained evidence and timestamps.
3. Check the payment-coverage input against the current system. The expected result from the loaded minutes is insufficient evidence for completed payment. Review the actual result before choosing it for the walkthrough, since additional public records could change the assessment.
4. Inspect the cited excerpts and arithmetic yourself. Use only the fixture's `input` content as the submitted material. Its expected values are operator references.
5. Use the long input for a separate length/workflow check when time permits. It can generate several claims and takes longer than the short passage.

## Three-to-five-minute sequence

- **Opening, about 30 seconds.** Show the official minutes and select the item headed 25XF0640. Explain that Wingman accepts text supplied from documents, transcripts, or other producers.
- **Authentic source, about one minute.** Paste the exact excerpt or open its completed run. Show the extracted assertion, original wording, official PDF citation, and page number. Explain precisely what the record establishes.
- **Numerical comparison, about one minute.** Say that the two housing statements were authored by the team as controlled checks. Show their actual assessments, the pinned rows, the common price band and geography, and the executable percentage-change calculation.
- **Coverage boundary, about 45 seconds.** Show the payment statement if preflight produced an appropriate result. Walk through the difference between the approval recorded in the minutes and the further evidence needed to establish a completed payment.
- **Client workflow, remaining time.** If the extension smoke check has passed, select text on a normal web page, open the side panel, and show the same run in the web app. Keep the result URL visible so a reader can revisit the check.

The evidence sources are public. The added value is the connection from an exact input passage to versioned official rows or a cited council-document page, followed by reproducible arithmetic and an inspectable assessment of coverage.

## Recording option

The council landing page currently embeds the recording titled “Plenari del Consell Municipal - 05/11/26”, published by Barcelona Ajuntament. Its title and channel were verified through YouTube oEmbed. A caption check with yt-dlp found neither subtitles nor automatic captions at the time of preparation. A transcript has therefore not been obtained for this walkthrough. [Official council recording](https://www.youtube.com/watch?v=DEJF6IGRuxA)

This recording is from 5 November 2026. The sourced credit excerpt comes from the separate 31 October 2025 minutes. Audio-to-text can supply future inputs through the existing text boundary.

## Optional API submission

This command submits the authentic excerpt and prints its result URL.

```sh
node --input-type=module <<'JS'
import { readFile } from 'node:fs/promises';
const fixture = JSON.parse(await readFile('eval/demo/council-credit-source.json', 'utf8'));
const base = 'https://council-checker-dev.snapnda.workers.dev';
const response = await fetch(base + '/api/runs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...fixture.input, submissionKey: crypto.randomUUID() }),
});
const result = await response.json();
if (!response.ok) throw new Error(JSON.stringify(result));
console.log(base + result.url);
JS
```

## Verified saved runs

These are real completed runs on the development deployment, suitable as a fallback after attempting fresh input:

| Example | Observed result | Saved run |
| --- | --- | --- |
| Opinion | Opinion/prediction checkability, zero factual claims | [Open](https://council-checker-dev.snapnda.workers.dev/runs/83270eb2-4d19-4a05-b6c2-1439c1d172b3) |
| Controlled housing comparisons | 0.47% Supported; 50% Contradicted | [Open](https://council-checker-dev.snapnda.workers.dev/runs/32f5b2c7-32c2-4bcf-8f28-b9b8a41b5c28) |
| Authentic credit excerpt | Four Supported claims; no technical errors | [Open](https://council-checker-dev.snapnda.workers.dev/runs/092214d8-d963-4756-b1ac-5fd674513fe4) |
| Completed-payment assertion | Insufficient evidence | [Open](https://council-checker-dev.snapnda.workers.dev/runs/c003a1c7-bfaa-4543-a741-ba002cd3501c) |
| Long official document | 33 terminal claims, two technical retrieval errors, one excluded unanchored candidate; overlap observed | [Open](https://council-checker-dev.snapnda.workers.dev/runs/7c9ae7fe-e9f3-4e9b-b611-42aa1f96effe) |

The final long document demonstrates progressive processing and visible partial failures; it is not a claim of complete factual coverage. Extraction and verdicts remain model-assisted. Keep source scope visible and inspect citations during rehearsal.

## YouTube deployment note

The private yt-dlp caption container and POST `/api/runs/youtube` are deployed. Requested intervals are at most180 seconds. The checked official council recording has no usable captions; use the sourced text example for a dependable walkthrough. A successful AP caption import contained only a short non-factual caption in its opening interval; another test video returned a retrieval503. Verify that the selected interval contains meaningful spoken subtitles before using a YouTube example. Audio transcription is out of this build's scope.

## YouTube playback client

The teammate's LiveFact YouTube client is now integrated in `apps/livefact-youtube` and packaged separately as `/downloads/livefact-youtube.zip`. Its [runbook](../apps/livefact-youtube/README.md) includes a verified speech excerpt, saved-result replay explicitly labelled as rehearsal, and a fresh visible-caption mode. This client reads visible YouTube CC through the browser; the server container API is a separate caption-ingestion option.

## Chrome extension demo kit

Open the [Wingman demo kit](https://council-checker-dev.snapnda.workers.dev/demo.html) for prepared selection-only inputs. Each card separates team-authored input from presenter notes, expected behavior, official-source links and previously computed fallback results. Select only the input, right-click **Check claims**, and inspect the result in the Wingman side panel; the kit has no submission/API flow of its own.

The kit includes opinion, the verified 845-record Ciutat Vella snapshot count, both exact controlled Catalan rent comparisons, a team-authored English rendering of the credit-approval fixture and the exact Spanish completed-payment statement. The English approval card links to the related authentic Catalan excerpt's saved run and labels that distinction.

The YouTube section links the saved-results replay at 845 seconds, explicitly marked **Guardado**, and a plain URL for fresh visible-CC analysis. That 48% video uses wider-web/Eurostat evidence; it is separate from the loaded Barcelona dataset examples. The current YouTube package is [wingman-youtube.zip](https://council-checker-dev.snapnda.workers.dev/downloads/wingman-youtube.zip).
