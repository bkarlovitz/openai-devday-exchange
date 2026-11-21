# Night Broadcast brand book reference draft

Use the [Wingman design system](../DESIGN.md) for the current product, approved logo, and four formal verdicts. This historical draft records the Night Broadcast brand book interpretation.

Machine-readable design system for AI agents and developers. Built on 2026-11-21 from `Night Broadcast Brand Identity.pdf` (Edition 01, 12 pages), `brand-palette.json`, the SVG marks in `Marks/` and `Motion/Timing and performance.txt`.

Use the token tables below when interpreting the historical brand book and campaign studies. Values tagged `source: inferred` were measured or proposed during that exploration.

---

## 1. Brand foundation

| Field | Value |
|---|---|
| Creative direction | Night Broadcast |
| Product name | Open. Reserve a wordmark area next to the mark. (The current codebase uses "Wingman"; see section 12.) |
| Campaign line | "Every claim gets its turn." Use as campaign line or landing headline. |
| What it is | A politically independent fact checker staged as a television courtroom. |
| Promise | A fair hearing for any claim. Show what the evidence supports, where it falls short, and which source people can open themselves. |
| Audience | Curious people who follow debates and interviews online. Barcelona first. Text checking in English, Spanish and Catalan. |
| Desired feeling | The satisfaction of seeing a claim tested in public, even when it comes from someone you support. |
| Core metaphor | A tiny courtroom under a serious spotlight. Stage the comedy as a real broadcast; give the judge the freedom of a cartoon. |

**Three roles that never mix:**
- **The judge sets the pace.** He listens, checks the source, pauses, then reacts with exaggerated energy.
- **The product explains the ruling.** Claim kept intact, finding in plain language, source one click away, same standard for every speaker.
- **The joke lands on the claim, never on the person.**

---

## 2. Design tokens

```json
{
  "color": {
    "brand": {
      "midnight-ink":   { "value": "#101F3C", "role": "Primary text, studio field, dark headers", "source": "pdf" },
      "broadcast-blue": { "value": "#38B4E7", "role": "Signature accent, top rules, spot graphics, emphasis", "source": "pdf" },
      "exhibit-ivory":  { "value": "#FBF3E1", "role": "Page background, reading surfaces, paper props", "source": "pdf" },
      "signal-tint":    { "value": "#D7EFF9", "role": "Pale blue accent; exhibit/source boxes", "source": "pdf" },
      "steel-feather":  { "value": "#A6B8C8", "role": "Neutral mascot and prop detail; borders", "source": "pdf" },
      "link-ink":       { "value": "#175572", "role": "Source links on ivory", "source": "pdf" },
      "outline-ink":    { "value": "#0C182E", "role": "Illustration outlines, ink on amber", "source": "pdf (SVG marks)" },
      "beak-ochre":     { "value": "#E4A04D", "role": "Mascot beak only", "source": "pdf (SVG marks)" }
    },
    "verdict": {
      "supported":    { "value": "#176144", "on": "#FFFFFF", "contrast": 7.42, "source": "pdf" },
      "unresolved":   { "value": "#F1AD20", "on": "#0C182E", "contrast": 9.06, "source": "pdf" },
      "contradicted": { "value": "#AC2E23", "on": "#FFFFFF", "contrast": 6.63, "source": "pdf" }
    },
    "surface": {
      "page":        { "value": "{color.brand.exhibit-ivory}", "source": "pdf" },
      "card":        { "value": "#FFFCF5", "role": "Raised card on ivory page", "source": "inferred" },
      "exhibit-box": { "value": "{color.brand.signal-tint}", "source": "pdf (page 11)" },
      "header-dark": { "value": "{color.brand.midnight-ink}", "source": "pdf (page 11)" }
    },
    "text": {
      "primary":   { "value": "{color.brand.midnight-ink}", "source": "pdf" },
      "secondary": { "value": "#4A5D73", "role": "Subtitles, counts, captions", "source": "inferred" },
      "eyebrow":   { "value": "#4A5D73", "source": "inferred" },
      "link":      { "value": "{color.brand.link-ink}", "source": "pdf" },
      "on-dark":   { "value": "{color.brand.exhibit-ivory}", "source": "pdf" }
    },
    "border": {
      "default": { "value": "#D8E1E5", "role": "Card and divider lines", "source": "inferred" }
    }
  },
  "contrast-pairs-verified": [
    { "fg": "#101F3C", "bg": "#FBF3E1", "ratio": 14.81 },
    { "fg": "#101F3C", "bg": "#38B4E7", "ratio": 6.90 },
    { "fg": "#FBF3E1", "bg": "#101F3C", "ratio": 14.81 },
    { "fg": "#175572", "bg": "#FBF3E1", "ratio": 7.37 },
    { "fg": "#FFFFFF", "bg": "#176144", "ratio": 7.42 },
    { "fg": "#0C182E", "bg": "#F1AD20", "ratio": 9.06 },
    { "fg": "#FFFFFF", "bg": "#AC2E23", "ratio": 6.63 },
    { "fg": "#4A5D73", "bg": "#FBF3E1", "ratio": 6.12, "source": "computed for inferred secondary text" },
    { "fg": "#175572", "bg": "#D7EFF9", "ratio": 6.83, "source": "computed for link in exhibit box" },
    { "fg": "#101F3C", "bg": "#D7EFF9", "ratio": 13.72, "source": "computed for text in exhibit box" }
  ],
  "font": {
    "family": {
      "display": { "value": "'IBM Plex Sans Condensed', 'IBM Plex Sans', system-ui, sans-serif", "weight": 700, "file": "Type/plex-condensed-bold.ttf", "source": "pdf" },
      "text":    { "value": "'IBM Plex Sans', system-ui, sans-serif", "weight": 400, "file": "Type/plex-sans.ttf", "source": "pdf" }
    },
    "size": {
      "display-xl": { "value": "64px", "lineHeight": 1.0,  "family": "display", "use": "Hero and page headlines", "source": "inferred" },
      "display-l":  { "value": "40px", "lineHeight": 1.05, "family": "display", "use": "Section titles, panel titles", "source": "inferred" },
      "claim":      { "value": "28px", "lineHeight": 1.15, "family": "display", "use": "Quoted claim, reaction line", "source": "inferred" },
      "title":      { "value": "22px", "lineHeight": 1.2,  "family": "display", "use": "Card titles, verdict label in large badge", "source": "inferred" },
      "body":       { "value": "18px", "lineHeight": 1.45, "family": "text",    "use": "Findings, explanations", "source": "inferred" },
      "body-s":     { "value": "16px", "lineHeight": 1.45, "family": "text",    "use": "Lists, counts, links", "source": "inferred" },
      "eyebrow":    { "value": "12px", "lineHeight": 1.3,  "family": "text", "weight": 700, "letterSpacing": "0.12em", "transform": "uppercase", "use": "Section labels, EXHIBIT 01 labels, FICTIONAL DEMO tags", "source": "inferred" }
    }
  },
  "radius": {
    "sm": { "value": "8px",  "use": "Chips, small badges, exhibit box", "source": "inferred" },
    "md": { "value": "12px", "use": "Swatches, stat cards", "source": "inferred" },
    "lg": { "value": "16px", "use": "Cards, panels", "source": "inferred" }
  },
  "border-width": {
    "hairline":  { "value": "1px",  "source": "inferred" },
    "top-rule":  { "value": "6px",  "color": "{color.brand.broadcast-blue}", "use": "Top edge of pages, share cards, speaker cards", "source": "pdf (visual)" }
  },
  "space": {
    "scale": ["4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px"],
    "card-padding": "24px to 32px",
    "source": "inferred"
  },
  "motion": {
    "supported":    { "duration": "2.2s", "source": "pdf" },
    "unresolved":   { "duration": "2.6s", "source": "pdf" },
    "contradicted": { "duration": "3.0s", "source": "pdf" },
    "reduced-motion": "Single expressive still, then the verdict, finding and source. No animation."
  }
}
```

### CSS custom properties (drop-in)

```css
:root {
  --nb-midnight-ink: #101F3C;
  --nb-broadcast-blue: #38B4E7;
  --nb-exhibit-ivory: #FBF3E1;
  --nb-signal-tint: #D7EFF9;
  --nb-steel-feather: #A6B8C8;
  --nb-link-ink: #175572;
  --nb-outline-ink: #0C182E;

  --nb-supported: #176144;
  --nb-unresolved: #F1AD20;
  --nb-contradicted: #AC2E23;

  --nb-surface-page: var(--nb-exhibit-ivory);
  --nb-surface-card: #FFFCF5;
  --nb-surface-exhibit: var(--nb-signal-tint);
  --nb-text: var(--nb-midnight-ink);
  --nb-text-secondary: #4A5D73;
  --nb-border: #D8E1E5;

  --nb-font-display: 'IBM Plex Sans Condensed', 'IBM Plex Sans', system-ui, sans-serif;
  --nb-font-text: 'IBM Plex Sans', system-ui, sans-serif;

  --nb-radius-sm: 8px;
  --nb-radius-md: 12px;
  --nb-radius-lg: 16px;
  --nb-top-rule: 6px solid var(--nb-broadcast-blue);
}
```

The brand book defines a light (ivory) system. There is no specified dark mode. For dark surfaces, use the "studio" treatment: Midnight ink background, Exhibit ivory text, Broadcast blue accents.

---

## 3. Color rules

1. **Blue belongs to the show.** Blues and ivory carry every scene. Broadcast blue is for emphasis, top rules and spot graphics, not for body text on ivory.
2. **Source links use Link ink (#175572) on ivory**, underlined. Never Broadcast blue for links on ivory.
3. **Verdict colors never appear alone.** Always pair the color with its word and its symbol (see section 5). Color is never the only signal.
4. **Do not use verdict colors for anything else** (no green success toasts, no red error banners, no amber warnings in brand style). Technical errors use neutral ink styling.
5. Only use foreground/background pairs from `contrast-pairs-verified`. On amber, text is always `#0C182E`, never white.
6. Keep feather shading neutral (Steel feather). Spotlight edges are warm or blue.
7. **No pink or purple.** Older reference images contain pink accents; they are retired.

---

## 4. Typography rules

- One family, two registers. **IBM Plex Sans Condensed Bold** is the broadcast voice: campaign headlines, short reactions ("Spectacular miss."), claim quotes, card titles. **IBM Plex Sans Regular** is the evidence voice: findings, quotes in running text, charts, verdict labels in lists, citations.
- Headlines are sentence case and end with a period ("Blue belongs to the show.").
- Eyebrow labels are uppercase, bold, letter-spaced, with ` / ` as separator: `04 / COLOUR`, `EXHIBIT 01 / SUNDAY TIMETABLE`.
- Claims are set in curly quotes: “All four city libraries open on Sundays.”
- Must render Catalan and Spanish fully: `Català · qüestió · col·laboració`, `¿Cómo lo sabemos?`. Plex covers these; test the middle dot (l·l) and inverted punctuation.
- Fallback: system sans.

---

## 5. Verdict system

Exactly three public verdicts. Each has a formal label, a broadcast reaction, a color and a symbol.

| Verdict | Reaction line | Color | Symbol (file) | Shape |
|---|---|---|---|---|
| Supported | Checks out. | #176144 | `Marks/supported.svg` | Rounded green square with white check |
| Unresolved | Jury’s still out. | #F1AD20 | `Marks/unresolved.svg` | Amber triangle with dark question mark |
| Contradicted | Spectacular miss. | #AC2E23 | `Marks/contradicted.svg` | Red octagon with white cross |

**Unresolved sub-labels** (from motion notes): show the specific label when known: `Mixed evidence` (sources conflict) or `Insufficient evidence` (something is missing).

**Non-verdict states** are separate and never use verdict colors or symbols:
- **Checking / in progress:** judge in listening pose plus a separate text status label.
- **Technical failure** and **not checkable** (opinion, prediction, unclear claim): neutral ink styling, plain explanation.

**Consistency rule:** the same finding gets the same reaction whoever said it. Interpretations of a speaker’s intent stay out of the verdict.

---

## 6. Components

### 6.1 Verdict badge
- Inline: symbol (20 to 24px) + verdict word in Plex Condensed Bold, colored with the verdict color on ivory/card surface. Example: [octagon] **Contradicted** in #AC2E23.
- Filled variant: verdict color background with `on` color text (pairs from section 2).
- Never show the color without word and symbol.

### 6.2 Claim card (share card)
Order, top to bottom:
1. 6px Broadcast blue top rule
2. Eyebrow (e.g. `FICTIONAL DEMO` when content is illustrative)
3. The claim, unchanged, in curly quotes, display font, size `claim`
4. Verdict badge (inline)
5. Reaction line, display font, size `title` or `claim` ("Spectacular miss.")
6. Finding in plain language, text font, size `body` ("Two of the four branches open on Sundays.")
7. Hairline divider
8. Exhibit label eyebrow `EXHIBIT 01 / SUNDAY TIMETABLE`
9. Source link in Link ink, underlined ("View the Sunday timetable")

Surface: card color, 1px border, radius `lg`, padding 24 to 32px.

### 6.3 Exhibit box
Signal tint background, radius `sm`, padding 16 to 20px. Contents: eyebrow `EXHIBIT 01`, source title in bold text font, link "View the source" in Link ink.

### 6.4 Panel header (debate companion / browser side panel)
Midnight ink bar, rounded top corners (`lg`), pigeon mark (colour version) on the left, title in Plex Condensed Bold, Exhibit ivory text.

### 6.5 Speaker report card (post-debate report)
- 6px Broadcast blue top rule, ivory surface, border, radius `md`.
- Title: speaker name (display font).
- **Show the number of checked claims first** ("6 claims checked"), then the distribution: one row per verdict with symbol, count and label.
- Link at bottom: "View claims and sources".
- Speakers get **equal space** side by side. Never rank or score speakers visually.

### 6.6 Campaign hero
Dark studio key art (Midnight ink field, warm spotlight, blue bounce). Eyebrow, headline "Every claim gets its turn." in Exhibit ivory, display-xl. Sub-line: "Select a statement. Open the exhibit."

### 6.7 Long-session behaviour
In a long debate, keep repeated reactions compact (badge plus one line, no full animation each time).

---

## 7. Voice and copy

- **The reaction can be sharp. The evidence line stays measured and exact.**
- Reaction lines are fixed: "Checks out." / "Jury’s still out." / "Spectacular miss." Do not invent new ones per claim.
- Finding lines by verdict:
  - Supported: name what the source supports. *"The register lists all four branches as open."*
  - Unresolved: say what is missing or what conflicts. *"The reports list different opening dates."*
  - Contradicted: explain the discrepancy. *"Two of the four branches open on Sundays."*
- Keep the claim word for word. Never paraphrase the quote.
- Ordinary language, no jargon, no judgement of the speaker.
- Link text describes the source ("View the Sunday timetable"), never "click here".
- Label any illustrative content `FICTIONAL DEMO`. Do not invent real claims, real speakers or scores.
- Product copy uses British spelling in the brand book ("colour", "recognise"). Keep it consistent within a surface.

---

## 8. Logo and mark

- **The mark** is the pigeon judge reduced to smooth head, thick frames and small beak. Recognise him by his glasses.
- Files: `Marks/pigeon-colour.svg` (primary), `pigeon-ink.svg` (single colour), `pigeon-reverse.svg` (on dark), `pigeon-tile.svg` (browser tile), PNGs at 16, 24, 32, 48, 128px.
- Use the **browser tile** for small placements (favicon, toolbar icon).
- Clear space: about one lens width around the standalone mark.
- Wordmark: reserve space to the right of the mark for the product name. Do not set a placeholder name in production.
- Use the compact mark when there is no room for the full judge.

---

## 9. Mascot and illustration

**The pigeon judge:** an attentive city pigeon with a dry stare, a robe that can flap and glasses you can spot across the room.

- **Construction:** smooth pigeon head, compact body, thick dark glasses, short ochre beak, ivory tabs (bands), oversized dark robe. Face simple enough for a reaction close-up. Grey body (Steel feather shading).
- **Performance:** attentive when listening; turns his head to read with one eye; pauses for a deadpan look; body, glasses and robe punch up the impact.
- **Recurring props:** warm ivory exhibit sheet, heavy approval stamp, gavel, studio replay monitor. Same dark outline and deliberately simple shapes as the judge.
- **Art direction:** warm spotlight, blue bounce, ivory paper. Keep the space around the judge dark enough for eyes, glasses and exhibit to read.
- **Civic photography mix:** everyday civic settings, unposed viewpoints, practical light. Preserve camera perspective; ground the illustrated judge with a contact shadow.
- References for consistency: `References/13-character-expressions.png`, `14-character-turnaround.png`, `15-character-construction-and-props.png`.

**Expression mapping:** listening = checking in progress; smug stamp triumph = Checks out; over-the-glasses peer = Jury’s still out; spotting the discrepancy = Spectacular miss.

---

## 10. Motion

Principle: **the exhibit arrives before the reaction.** Give a readable pause to inspect the decisive line. Timings are starting points.

| Verdict | Length | Beats |
|---|---|---|
| Supported | ~2.2s | 0.0 read exhibit · 0.5 heave stamp · 1.0 stamp desk · 1.4 bounce (feet and robe clear the bench) · 2.2 overformal bow, settle on verdict and finding |
| Unresolved | ~2.6s | 0.0 raise gavel · 0.6 notice detail · 1.2 brake above block · 1.8 peer over crooked glasses · 2.6 hold. Mixed: dart between exhibits. Insufficient: search for missing detail. Show the specific label. |
| Contradicted | ~3.0s | 0.0 inspect source · 0.6 tilt to read line · 1.2 deadpan stare · 1.8 cut wide for dive · 2.2 ivory splat on outer edge of claim bubble · 3.0 unchanged quote, verdict and source on stable ivory |

- Checking state: quiet listening pose.
- Silent version reads through pose, cut, expression and result label.
- `prefers-reduced-motion`: one illustrative still, straight to finding and source.
- Same performance for every speaker. Keep repeats short.

---

## 11. Accessibility checklist

- [ ] Verdicts always show word + symbol + color.
- [ ] Text pairs only from the verified contrast list (all at or above 6:1, well past WCAG AA 4.5:1).
- [ ] Symbols have `aria-label` / `<title>` matching the verdict word (the supplied SVGs already do).
- [ ] Status changes (checking, verdict arrived) announced to screen readers as text.
- [ ] Reduced motion respected.
- [ ] Source links are real, descriptive and keyboard reachable.
- [ ] Catalan and Spanish characters render.

---

## 12. Do and don't

**Do**
- Keep the claim intact, the finding plain and the source one click away.
- Give every speaker equal space and the same standard.
- Use the top blue rule and ivory paper to tie surfaces together.

**Don't**
- Use pink, purple or colors outside the palette.
- Show a verdict color without its word and symbol.
- Mock the speaker or guess their intent in the verdict.
- Rank speakers or present scores as a leaderboard.
- Use the full judge illustration at small sizes (use the mark or tile).
- Invent real-looking claims or speakers in demos.

---

## 13. Open items and known conflicts

- **Product name and wordmark:** not decided in the brand book. The repo currently uses "Wingman".
- **Existing UI differs from this system.** `docs/design/wingman-brand.md` (2026-11-21) applied ivory `#fff5df`, navy `#112344`, sky `#47b1e4`, Archivo display and Source Serif 4 italic, and keeps four evidence verdicts. The brand book specifies the values above, Plex only, and three verdicts. Decide which wins before the next UI pass.
- **Inferred values** (card surface, secondary text, border, type scale, radii, spacing) were measured from the rendered PDF or proposed. Confirm with the designer.
- **Dark mode:** not specified.

---

## Related
- `Night Broadcast Brand Identity.pdf`: source brand book
- `brand-palette.json`: exact palette and contrast values
- `ASSETS.md`: asset inventory and character reference history
- `Motion/Timing and performance.txt`: full motion notes
- `../wingman-brand.md`: current product UI application
