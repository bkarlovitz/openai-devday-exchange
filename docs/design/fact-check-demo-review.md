# Fact Check reference review

Planning only. This review does not authorize or implement a visual redesign. The supplied [HTML](fact-check-demo.html) is the source of truth for the requested appearance; preserve it unchanged. Its SHA-256 is `199e92d79bae14248aff64ac04bd1798478235e18d23951a9e8efd7129efbd26`.

## Inspection and browser evidence

Read all 820 lines, including the complete CSS, scripted content, state machine, event handlers and animation loop. Exercised the original file in Chromium at **1440 × 1000** and **390 × 844**, with reduced motion enabled. Browser-only animation clock control accelerated its five-minute episode without editing the source. Captures and the browser interaction report are retained in [fact-check-demo-evidence/](fact-check-demo-evidence/). Both widths produced all **11 resolved cards: 6 facts, 5 arguments; 4 green, 4 yellow, 3 red**. Desktop panel measured 400px; narrow panel measured 390px; neither viewport had horizontal page overflow.

The reference is one interactive scene with multiple states, rather than separate routed pages:

| View/state | Exercised behavior | Implementation implication |
| --- | --- | --- |
| Empty browser and panel | New tab, no-video illustration, legend, current-tab check -> no-video notice | Replace unsupported source detection claims with accurate availability and paste/import actions. |
| Link intake | Open, focus, empty-disabled submit, invalid URL error, close/reset, valid URL loading then playback | Reference accepts arbitrary HTTP URLs and always loads its sample. Real clients must show supported-provider rules and actual failures. |
| Live ready/listening | Sample open before play, play/pause, first gray pending card, resolved card | Real progress comes from capture/extraction/research, never a timer. |
| Live analysis paused | Pause/resume analysis, skipped claims while video continued | Reference deliberately loses paused claims; production behavior needs an explicit capture policy before adopting this interaction. |
| Live ended/replayed | Ended footer, replay resetting session | Preserve saved runs and deliberate new-submission identity. |
| Recorded ready/playing/paused | Mode switch, playback at 1×/2×/4×, range seek, clock/head/markers | Video control belongs to an actual player/content-script bridge. |
| Recorded history | Future cards disappear after backward seek; timestamps/detail jump and timeline markers seek two seconds before a claim | Do not silently erase available whole-transcript results; offer an explicit playback-synced view if supported. |
| Result filtering | All/Facts/Arguments with counts, including empty argument feed early on | Actual factual-claim clients cannot invent argument results. |
| Every expanded card | Open/close all 11 cards, factual source lists, source-free argument explanations, all pattern tags | Keep actual citation IDs, excerpts, snapshot coverage and calculations accessible inside matching visual hierarchy. |
| Verdict families | Gray analyzing; green True/Sound; yellow Misleading/Weak; red False/Fallacious | Visual colors are reusable; categorical factual verdicts and logical-quality labels are distinct concepts. |
| Dispute | Button becomes disabled Disputed; thanks acknowledgment survives collapse | Reference stores this only in memory. Do not promise a review submission without a real persistence/triage path. |
| Feed arrival | Bottom-following feed, scroll away, new-items pill, return to latest | Preserve scroll and keyboard focus; avoid replacing inspected details during polling. |
| Utility controls | Settings toast, restart clears session, open sample, both mode buttons and all speeds | Settings are a placeholder; toolbar/sample player are demo framing, not application features. |
| Narrow layout | Toolbar wrapping, browser above panel, full-width 760px-high panel, smaller avatars/captions | Real extension follows available host height; web uses responsive columns/stacking rather than a fake browser. |

Activated all seven external source anchors at each viewport (14 popups total), with navigation intercepted to confirm target opening without researching publisher pages. Source destinations are static publisher homepages in this fixture, not verified evidence. Their factual assertions were not independently researched as part of this visual review.

## Visual tokens and assets

| Category | Reference values |
| --- | --- |
| Canvas/surface/text | Desk `#E7E7E2`; surface `#FFFFFF`; ink `#1B1B19`; muted `#5F5F5A`; line `#EDEDEA`; link/focus blue `#1F4FD1` |
| Positive | Card `#F1FAF4`; edge `#BFE3CC`; badge `#17773F`; chip `#D9F0E1` / `#146C3A` |
| Caution | Card `#FFF9E8`; edge `#F0D486`; badge `#F5B40B`; chip `#FCEBB8` / `#7A5000` |
| Negative | Card `#FEF3F3`; edge `#F2BDBD`; badge `#C62828`; chip `#FADADA` / `#A31F1F` |
| Pending | Card `#F7F7F5`; edge `#E4E4E0`; neutral badge `#E6E6E1`; muted quote |
| Typography | Inter body 14px; Space Grotesk display/brand; JetBrains Mono timestamps; brand 17px; context title 15px; quote 14.5px/1.45; detail 13.5px/1.55; small labels 10.5–12.5px |
| Geometry | Panel 400px; header mark 30px/radius8; card radius12/padding10–12; panel gutters16; filter radius11; score46px/radius11; timestamp28px; main actions44px; timeline markers14px |
| Motion | Spinner .9s, pulse1.6s, shimmer1.3s, card entry .35s, resolve .7s, score pop .45s; all disabled for reduced motion |

All illustrations and icons are inline SVG or CSS; avatars are letter circles. There are no photo/video binaries. Google Fonts are the only external asset dependency. Keep a system fallback and decide whether to self-host those three font families for consistent extension rendering; no raster/image generation is needed. Recreate the magnifier/check brand mark as a small local SVG, and reuse Lucide equivalents for interface icons where visually equivalent.

## Gaps against the actual system

| Area | Current implementation | Planned closest truthful match |
| --- | --- | --- |
| Web | Instrument Sans, green editorial form/results; text/subtitle intake, PDF-derived text, and separate YouTube clients; original passage, official evidence, progressive claims | Adopt reference neutrals, blue links, display/mono typography, compact result cards and counters. Keep intake and original-text workspace; use a wider evidence view alongside the compact feed. No fake browser or simulated player. |
| Council extension | React/shared ClaimCard, selected text/paste, per-tab stored run, polling, extraction warnings, classification, longer-text web handoff, recovery/language controls | Match header/context/filter/card/footer geometry and color states. Keep TEXT source mode and all actual failure/progress states. Add timestamp actions only when a working source bridge exists. |
| LiveFact YouTube extension | Separate DOM/CSS client; warm beige palette; real video timeline/seek, caption capture, facts/arguments filters, backend options, saved/demo labels | Closest structural fit to reference. Restyle its real controls/feed and preserve live/capture/unsupported states. Distinguish saved/demo entries from backend-checked facts, and coordinate its worker bridge rather than copying simulated handlers. |
| Backend truth | Supported/contradicted/mixed_evidence/insufficient_evidence; technical failure and not_checkable; advisory statement-type classification | Keep all distinct. Mixed and insufficient may share yellow styling but must retain different labels and counts. Error is technical, not a false verdict. Opinion/prediction classification is not a fact verdict. |
| Numeric rating | Backend has no calibrated 0–100 accuracy or logical-soundness score | Use the reference badge footprint for a categorical symbol/label, not an invented number. Scores require a separate approved model/contract/evaluation design. |
| Arguments/patterns | Demo hardcodes fallacies and scores; factual pipeline does not emit these semantics | Preserve existing independently sourced LiveFact argument material with explicit provenance if available; do not classify opinions as false or manufacture pattern labels. |
| Sources/calculations | Actual evidence has source excerpts, document pages, dataset samples/full aggregates, periods, snapshot metadata and code-computed arithmetic | Retain this richer evidence behind concise source rows. A sample preview must never visually become a complete dataset total. |
| Recovery/languages | New technical retry and en/es/ca explanation switching preserve command identity and assessment facts | Fit them into reference-style utility controls; maintain progress/errors and actual explanation-language labels while older text remains visible. |
| Unsupported demo actions | Generic-video support, review submission, pause-skipping, global playback controls, synthetic scores | Hide unavailable controls or show an accurate disabled explanation. No success toast for an operation the real application did not perform. |

## Proposed build order

1. Agree the semantic adaptations above and the brand name. The visual reference calls the product Fact Check; deployed clients currently say Council Check and LiveFact.
2. Extract scoped shared visual tokens, icons and card/filter/context primitives without changing API or persistence.
3. Match Council panel first against 400px screenshots, adapting long passages, real status, language/retry controls and source inspection.
4. Apply the same primitives to the web intake/results workspace and narrow layout.
5. Apply visual parity to LiveFact through its existing video/capture bridge; keep unsupported generic-video and dispute behavior out of the first design pass.
6. Check the full state matrix below with real/mocked API fixtures and a live smoke test. Only expand backend/product scope through a separate decision.

Concrete implementation phases and acceptance criteria are in [TASK-014](../../.viktor/tasks/TASK-014.md). This document records the reference and planning recommendations, not completed redesign work.

## Subsequent implementation

After this complete reference review, the user authorized implementation within the wrap-up window. The visual adaptation is now implemented across the three clients, with categorical badge substitutions and unsupported simulated capabilities omitted as described above. See TASK-014 and the task log for delivery proof. The supplied HTML remains unchanged.
