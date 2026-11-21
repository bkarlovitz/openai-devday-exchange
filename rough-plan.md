# F1: City council claim checker, build plan

## Pitch and demo story

Paste in a Barcelona city council plenary session and get back a list of every number-based claim: who said it, the timestamp in the video, the official dataset that tests it, and a verdict of supported, misleading, contradicted or can't be verified.

- **Who it helps:** journalists and fact-checkers covering city hall, neighbourhood associations, and opposition and government staff.
- **How it's done today:** someone watches hours of video, writes down the claims, hunts through Open Data BCN or INE, and does the maths by hand. Most claims never get checked.
- **Challenge fit:** fact-checking. "Check a consequential claim" maps to the verdict, "show the evidence" to the dataset and query, and "what you can't verify" to the can't-be-verified label with its reason.

### The 5-minute demo

1. **0:00–0:40, the problem.** Show the 5 November 2026 plenary on YouTube and note its length.
2. **0:40–1:30, run it.** Load a pre-processed segment, or show the pipeline running live on a 2-minute clip.
3. **1:30–3:30, one claim end to end.** A councillor's housing or tourism figure → speaker and timestamp → the dataset and query used → a chart → the verdict and why.
4. **3:30–4:15, honesty.** Show one claim marked can't be verified and the reason (no dataset, wrong period, a definition that doesn't match).
5. **4:15–5:00, what's live and what's simulated,** then questions.

## Client architecture

The web app gives journalists a shareable claim page. An optional browser extension lets someone watching the plenary inspect the same evidence alongside the video. Both clients read the same session result, keyed by YouTube video ID, and reuse the TypeScript types, Effect Schema validation, and React claim cards. The processing CLI owns the model calls, official data lookups, and verdict calculation.

- **Web app.** Serve the Vite/React app and prepared session results from Cloudflare Workers. Give each claim a stable URL that opens its quote, timestamp, source rows, and calculation.
- **Extension option.** For the hackathon, assume desktop Chrome and a direct YouTube watch page. Clicking the extension icon opens a Manifest V3 side panel and uses the active tab URL to identify the video. The panel shows claims in timestamp order. Clicking a timestamp takes the current video tab to that moment. A separate link opens the shareable evidence page. For a video outside the prepared set, show “This video hasn’t been checked yet.” [Chrome side panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- **Demo milestone.** Once the first web claim card works, reuse it in an unpacked extension with the same prepared session JSON. Rehearse opening the panel on the demo recording, jumping to the quote, and sharing its evidence page. If judges need to submit fresh recordings, both clients can submit the video URL to one Hono endpoint and display progress from the same background processing job. Automatic highlighting during playback and support for embedded players are stretch goals.

## Pipeline

Six steps take a session from video to verdicts. Steps 2–4 need AI; the verdict in step 5 is plain code, so it can be audited.

1. **Get the audio.** The Ajuntament's page embeds the latest session from YouTube. Download it with yt-dlp, extract the audio track, convert it to mono speech-quality audio, and split it at silences. [The Transcriptions API takes files up to 25 MB](https://developers.openai.com/api/docs/guides/speech-to-text/index.html), and developers report a [1,500-second limit per request](https://community.openai.com/t/gpt-4o-transcribe-audio-length-limits/1148374) on gpt-4o-transcribe, so keep chunks under about 24 minutes.
2. **Transcribe with speaker labels.** [gpt-4o-transcribe-diarize](https://developers.openai.com/api/docs/models/gpt-4o-transcribe-diarize) labels who is speaking, returning segments with start and end times and a speaker. Give the prompt the councillors' names and Catalan place names so they're spelled correctly.
3. **Name the speakers.** The chair announces each speaker ("té la paraula la senyora…"). A model call with Structured Outputs maps each diarization label (A, B, C…) to a councillor and party, using those announcements plus the list of members.
4. **Extract checkable claims.** One Structured Outputs call per segment returns only claims that contain a number or a comparison, in the schema below, and drops opinions and promises.
5. **Route each claim to data, then decide.** The Responses API with function calling picks a tool (`search_opendata_bcn`, `query_dataset`, `ine_series`, `incasol_rent`), fetches the figure, and returns it. A deterministic function compares the claimed and official values and gives the verdict and the reason.
6. **Check for earlier fact-checks and publish.** Call the Google Fact Check Claim Search API for coverage that already exists, then render claim cards: quote, speaker, timestamp link into the video, dataset link, query, a small chart, verdict.

## Data and endpoints

Each function the model can call wraps one official source. Open Data BCN runs on CKAN, so a single API covers search over the whole catalogue and row-level queries.

| Tool the model can call | Source | Endpoint / access | Typical claims it checks |
| --- | --- | --- | --- |
| `search_opendata_bcn(q)` | [Open Data BCN CKAN API](https://opendata-ajuntament.barcelona.cat/en/node/1440) | `/data/api/3/action/package_search?q=…` | Finds the right dataset for any city topic |
| `query_dataset(resource_id, filters)` | Same | `/data/api/action/datastore_search?resource_id=…&q=…` | Pulls the rows behind a figure |
| `tourist_flats(district)` | [Barcelona tourist flats register](https://opendata-ajuntament.barcelona.cat/data/en/dataset/habitatges-us-turistic) | CSV download | "There are X tourist flats in district Y" |
| `population(area, year)` | [Population by municipal register](https://opendata-ajuntament.barcelona.cat/data/dataset/pad_mdbas) | CSV, CC BY 4.0 | Population and growth claims |
| `incasol_rent(area, quarter)` | [Incasòl rental deposit register](https://datos.gob.es/en/catalogo/a09002970-registro-de-las-fianzas-de-alquiler-de-viviendas-por-municipio) | Open download, quarterly | "Rents rose / fell X%", average rent |
| `ine_series(table_or_series)` | [INE JSON API](https://www.ine.es/dyngs/DAB/en/index.htm?cid=1100) | `servicios.ine.es/wstempus/js/{lang}/DATOS_TABLA/{id}`, e.g. rental index table 59061 | Inflation and the rental price index by district |
| `prior_checks(text)` | [Google Fact Check Claim Search](https://developers.google.com/fact-check/tools/api/reference/rest/v1alpha1/claims/search) | `factchecktools.googleapis.com/v1alpha1/claims:search`, API key | Has someone already checked this? |
| Session inputs | [Plenary page](https://ajuntament.barcelona.cat/ca/accio-de-govern/el-consell-municipal) | YouTube video, agenda PDF, resolutions DOCX | Speaker list, agenda items, context |

So you're not guessing on stage, pre-load 5–8 datasets that match the 5 November agenda (housing, tourism, population and whatever else is on it). Use the CKAN search live only for claims those don't cover.

## Claim schema and verdict rules

The extraction step returns this shape through Structured Outputs. Every field the verdict function needs is required, so a claim without a number never reaches it.

~~~json
{
  "speaker": "string (councillor name)",
  "party": "string",
  "start_s": 0,
  "quote": "exact words, original language",
  "claim_type": "level | change | comparison | ranking",
  "metric": "e.g. average monthly rent, tourist flats, population",
  "place": "city | district | neighbourhood name",
  "period": "e.g. 2025, Q1 2026, since 2023",
  "value": 0,
  "unit": "EUR | % | count | ...",
  "direction": "up | down | none",
  "checkable": true
}
~~~

The verdict is decided in code, not by the model:

| Verdict | Rule |
| --- | --- |
| Supported | Official value within ±5% of the claim (±1 point for percentages), same place and period |
| Misleading | Number roughly right but period, place or definition cherry-picked, or the direction is right and the size isn't |
| Contradicted | Official value outside tolerance, or the direction is wrong |
| Can't be verified | No matching dataset, data not yet published for that period, or the claim's definition doesn't match any official one; the reason is shown |

The tolerances are a starting point. Show them on screen so judges can see the rule.

## Evaluation, team split and timeline

**Outside judge.** Don't let the model grade itself. Two checks:

1. **Transcription and speaker names:** run the pipeline on an older session whose official minutes are published, such as the [31 October 2025 plenary minutes](https://ajuntament.barcelona.cat/sites/default/files/2025-12/CPlenari%2031-10-25-Acta.pdf), and compare who said what against the minutes.
2. **Verdicts:** hand-label 15–20 claims from the demo session (speaker, value, official figure, verdict) before running the tool, then report how many it matched. One honest number on screen beats a polished demo.

**Team split (4 people; merge roles if you're fewer):**

| Role | Owns |
| --- | --- |
| Audio + transcription | Download, chunking, diarization, speaker mapping |
| Claims | Extraction prompt, schema, hand-labelled test set |
| Data tools | CKAN, INE and Incasòl wrappers, pre-loaded datasets, verdict function |
| Front end + pitch | Claim cards, timestamp links, charts, demo script |

**Order of work:**

1. Pick a 15–20 minute stretch of the 5 November session with a housing or tourism debate, and hand-label its claims.
2. Get transcription and speaker labels working on that stretch.
3. Build the extraction step and compare it with the hand labels.
4. Write the data tools and the verdict function for the datasets those claims need.
5. Build the claim cards and the timestamp links.
6. Run the evaluation, freeze the demo data, and rehearse twice.

## Risks, simulated parts and judges' questions

| Risk | Mitigation |
| --- | --- |
| Diarization mixes up speakers when people interrupt each other | Map speakers from the chair's announcements; show confidence; fix by hand for the demo clip |
| Most claims are vague ("more than ever") | Mark them can't be verified with the reason; that's part of the brief |
| No dataset for a claim | Pre-load the datasets that match the agenda; fall back to CKAN search |
| Latest data lags the session (quarterly sources) | Compare against the latest published period and say so in the verdict |
| Live API slow on stage | Pre-run the demo clip and keep a cached result; show one step live |

**Say this clearly in the demo:** transcription, speaker mapping, claim extraction, data lookup and verdicts run for real on the 5 November recording. Pre-loading datasets and caching results are prep work, not fakes. If you skip the live YouTube download, say so.

**Likely judges' questions:**

- *How do you know it's right?* The hand-labelled set and the score against it, plus the official minutes for checking speaker names.
- *Why not just ask ChatGPT?* The model never decides the verdict. It finds and structures the claim; official data and visible rules decide.
- *Is it politically biased?* The same rules apply to every speaker, and every verdict links to its source and query.
- *What's next?* Run it on every session automatically after each plenary and publish a public archive of claims.

## Sources

- [Barcelona plenary page](https://ajuntament.barcelona.cat/ca/accio-de-govern/el-consell-municipal)
- [OpenAI speech to text guide](https://developers.openai.com/api/docs/guides/speech-to-text/index.html)
- [gpt-4o-transcribe-diarize model page](https://developers.openai.com/api/docs/models/gpt-4o-transcribe-diarize)
- [OpenAI Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI tools guide (Responses API)](https://developers.openai.com/api/docs/guides/tools)
- [Open Data BCN API guide](https://opendata-ajuntament.barcelona.cat/en/node/1440)
- [INE API reference](https://www.ine.es/dyngs/DAB/en/index.htm?cid=1100)
