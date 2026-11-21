# TASK-014: Match the supplied Fact Check interface across real clients

## Objective

Bring the web app, Council side panel and LiveFact YouTube panel as close as possible to the supplied visual reference while retaining accurate backend behavior and source inspection.

## Status and references

**Delivered visual adaptation, validated and deployed.** This task plans the visual work; execution remains subject to the existing session scope. It does not add the prototype’s simulated backend capabilities. Validation and intentional differences are recorded in the task log.

- Exact supplied source: [fact-check-demo.html](../../docs/design/fact-check-demo.html).
- Complete review, tokens, state inventory and semantic gaps: [fact-check-demo-review.md](../../docs/design/fact-check-demo-review.md).
- Desktop/mobile browser captures and interaction report: [evidence directory](../../docs/design/fact-check-demo-evidence/).
- Previous side-panel reference: docs/design/extension-side-panel.html, retained as history; use the newer Fact Check demo for this task.
- Read AGENTS.md, docs/engineering/stack.md and verification.md before implementation; follow yook with the approved hackathon workflow. Run local checks; no GitHub Actions.

## Milestone

M8: Reference design parity. The real clients share the supplied visual language while retaining working evidence and commands.

## Why

The user supplied a newer full interactive reference and requested the closest possible match. It supersedes the earlier side-panel reference for visual work.

## Requirements

Implement the phased visual changes below with explicit reference comparisons and preserve actual backend state, verdicts, sources and command behavior. Record intentional differences from unsupported prototype capabilities.

## Working assumptions to review

1. Product name/mark: retain Council Check and LiveFact labels or adopt Fact Check consistently. Do not silently rebrand.
2. Approve adapting reference number-score boxes to categorical verdict badges; the backend has no calibrated 0–100 scoring. Define distinct visible labels for mixed versus insufficient evidence.
3. Confirm the first pass covers real supported clients only: selected text, transcript/document intake and YouTube/capture. Generic video providers, dispute submission, argument-quality scores and pause-skipping require separate explicit scope.
4. Font delivery: use the three reference families with system fallback; decide whether to self-host local font assets rather than depend on Google Fonts in Chrome.

## Phase 1 — Shared visual foundation

Owner: UI implementer. Files: packages/ui, shared/scoped styles; avoid backend, contracts and data-model changes.

- Extract reference color, typography, spacing, radii, motion and focus tokens. Keep extension styles scoped to prevent LiveFact content-page leakage.
- Add/reuse local SVG mark and interface icons. Use existing React/shared UI and Lucide; no new styling or state framework.
- Create/rework compact source-context, progress summary, filter pill, status badge and expandable result primitives. Keep the two yellow verdict categories identifiable by text.
- Treat score area as a categorical badge, and processing status separately from the eventual verdict. Preserve semantic headings, keyboard expansion, aria-pressed and focus visibility.

Acceptance: sample components match reference geometry at 400px and use actual contract statuses. No fabricated scores, argument labels, sources or success states appear.

## Phase 2 — Council Chrome side panel

Owner: UI implementer. Files: apps/extension/src/sidepanel.tsx, styles.css and shared UI.

- Match header/brand, source mode/title/host, context gutters, summary, filters, color cards and fixed footer to the reference.
- Retain selected-text context-menu handoff, paste fallback, per-tab persisted runs and command/submission identity. A visual change must not resubmit stored text or create another run.
- Keep extraction and checking progress concurrent, warnings and partial errors visible; preserve checkability notice for zero-claim opinions and explicit source-link failure copy.
- Fit language/retry controls into the visual hierarchy. Keep old explanations visible with their actual language while replacements process.
- Keep the long-text web prompt and exact same-run link. Show timestamp navigation only for a supported working source bridge; text positions remain available otherwise.
- Expanded cards retain citation anchors, source excerpts/pages, rows/snapshot metadata, aggregate/sample coverage, uncertainty and calculations. Do not replace them with bare publisher links.

Acceptance: reference-like 400px panel plus usable 320px narrow panel; complete fixture matrix below; real selected-text check and same web run still work. No hidden controls under sticky footer.

## Phase 3 — Web intake and results workspace

Owner: UI implementer. Files: apps/web/src/routes, styles and shared UI; coordinate with anyone changing intake adapters.

- Apply reference visual tokens and compact cards without creating a fake browser or sample video player.
- Keep paste and supported import paths, original text, optional source/language, exact passage offsets and accepted-size feedback.
- Wide results may use a source/original-text workspace beside the feed. Narrow layouts stack with natural document scrolling and no clipped evidence tables or long URLs.
- Add reference-style summary and filters only where categories have real data. Factual clients can keep All/Checking/Reviewed instead of an empty unsupported Arguments promise.
- Keep language switching and retry actions operational while preserving stable claim links and already completed evidence.

Acceptance: desktop and 390px/320px mobile screenshots; original submission unchanged after import; optional metadata, retries and translations behave as before; content remains readable without external fonts.

## Phase 4 — LiveFact video panel parity

Owner: LiveFact/UI implementer; independent from backend work. Files: apps/livefact-youtube/index.html, panel.ts, panel.css. Coordinate worker.ts changes with its current owner.

- Apply matching header, context/live-recorded badges, mono clock/timeline, summary, pills, cards and footer to the real player integration.
- Connect timestamp and marker controls to the existing seek bridge; use recorded/live capabilities from actual video state. Do not copy the reference simulation loop.
- Preserve real caption/capture readiness, streaming/busy/error/no-subtitle states, selected video, source links, saved/demo labels and backend provenance.
- Style actual existing argument entries distinctly where supplied, without mapping them to factual verdicts or inventing logical ratings.
- Implement autoscroll only near the bottom, new-item pill when inspecting history, stable expanded details/focus. Define pause behavior accurately; do not silently skip transcript text.
- Show only working settings/actions. Dispute is omitted or accurately disabled until a real review path exists.

Acceptance: actual video/current-tab readiness, capture, recorded seeking, source opening and saved-run links work. Live state cannot advertise seek when unavailable. Simulated/sample material stays explicitly labelled.

## Validation

Phase 5 — focused verification and delivery

- Run existing typechecks and web/extension/LiveFact builds appropriate to touched work; run scoped formatting/linting. No production-hardening expansion or framework rewrite.
- Browser fixtures cover: empty/paste/import, unsupported URL, queued/extracting/researching/assessing, all four factual verdicts, technical error/retry, partial failure, not-checkable opinion, zero-claim extraction warnings, repeated timestamps/speakers, translation pending/error/complete, and long-text web handoff.
- Verify a failed transport replays the same mutation command UUID; deliberate terminal retry creates a fresh UUID; translated explanations preserve verdict/source/arithmetic.
- At 1440×1000, 400px side-panel width, 390×844 and 320px: inspect collapsed/expanded cards, all filter states, source tables, focus, footer, large text and reduced-motion preference. Check no horizontal document overflow.
- LiveFact-specific fixtures: no video/no captions, ready, live capture, recorded seek/marker, paused capture semantics, new-items pill, saved/demo distinction and provider failure.
- Compare screenshots to the supplied HTML, noting intentional truth-preserving differences. Do one real end-to-end check through each affected client rather than broad redundant test suites.
- Record commands, screenshots, tested commit and limitations in the yook log. Only then mark task done and commit/push under session authority.

## Coordination and boundaries

Shared UI/tokens should land first; then web/Council and LiveFact visual work can proceed in parallel with distinct file ownership. Backend/source/research work continues independently. Do not change contracts to make the UI resemble demo fixtures. Any new scoring, dispute storage, playback orchestration or argument-analysis capability needs its own separately reviewed task and validation.

## Completion Notes

After implementation and validation, set TASK-014 done in the task index, append actual proof and intentional visual differences to `.viktor/logs/LOG.md`, and commit/push under the session’s delivery authority. Planning and reference review alone do not complete this task.

## Delivered adaptation

Applied the reference visual system across web, text panel and YouTube panel: Fact Check mark/branding, local Inter/Space Grotesk/JetBrains Mono fonts, reference palette/geometry, categorical colored cards, filters, counters, expandable evidence, timestamps and working timeline. Kept the four real verdicts and separate technical/checkability states. Numeric truth/argument scores, disputes and a simulated browser/player were not introduced. Font licenses are included in both ZIPs. Desktop/mobile and400px/320px fixtures passed; web and installed-package handoff checks used the deployed API. LiveFact preserves its newest-first feed when following new items.
