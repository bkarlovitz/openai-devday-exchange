# Wingman design system

This specification uses the product UI merged in [PR #18](https://github.com/bkarlovitz/openai-devday-exchange/pull/18) as its implementation baseline. The [Night Broadcast brand book](night-broadcast/Night%20Broadcast%20Brand%20Identity.pdf) supplies campaign art direction, character and motion. Its earlier palette studies and the draft supplied for review are references.

## Identity

[Approved logo kit and preview](wingman-logo/wingman-preview.png) · [Download all logo files](wingman-logo/Wingman-logo-kit.zip)

- **Product name:** Wingman.
- **Product logo:** use the approved [Wingman wordmark and pigeon SVG](../../packages/ui/assets/wingman-logo.svg) in headers. The pigeon has round glasses and an orange beak. Use the [blue favicon](../../packages/ui/assets/wingman-favicon.svg) and the 16, 32 and 128 px blue toolbar icon exports. The illustrated judge with a robe remains the campaign and verdict character.
- **Campaign line:** “Every claim gets its turn.”
- The judge can be theatrical. The finding describes what the evidence establishes in plain language. Preserve the exact quote and apply the same visual and evidentiary standards to each speaker.

## Product foundations

Use [the shared theme at the product baseline](https://github.com/bkarlovitz/openai-devday-exchange/blob/81f6e51c765b1f8c2445c77f2cfd17b08bce401a/packages/ui/src/theme.css) for implementation. Keep the following roles consistent across new product components.

| Role | Value |
| --- | --- |
| Desk | `#FFF5DF` ivory |
| Surface | `#FFFFFF` |
| Text | `#112344` navy |
| Sky accent and tint | `#47B1E4` and `#DFF0F8` |
| Link and focus on light surfaces | `#176A96` |
| Display, body, editorial quotes | Archivo, IBM Plex Sans, Source Serif 4 Italic |

Sky is a decorative accent or a fill with readable text. On a sky surface, use navy for focus. Verify text against its actual background at 4.5:1 for ordinary text and 3:1 for large text. Verify essential control boundaries and custom focus indicators against adjacent colors at 3:1. Use 44 × 44 CSS px as the Wingman target for interactive controls where space permits. Static badges are labels. Body sizes, corner radii, padding and proposed grid values require testing at the component level.

Support the language of the interface on the document root and mark passages in a different language where the product knows it. Let Spanish and Catalan wrap naturally. Check diacritics, the Catalan middle dot, and inverted punctuation with the bundled fonts at narrow widths.

## Verdicts

Use a visible label and a shape with color. The fills below are the baseline shared result-card badge pairs. Existing clients may use lighter tints for timelines and card backgrounds. Keep the four formal outcomes distinct in results, filters, summaries and accessible text.

| Formal label | Signal | Badge fill / ink | Reaction |
| --- | --- | --- | --- |
| Supported | Check | `#26774F` / `#FFFFFF` | Checks out. |
| Mixed evidence | Mixed marker (`±` in shared cards, partial circle in YouTube) | `#EFB52D` / `#2E2000` | Jury’s still out. |
| Insufficient evidence | Question mark | `#EFB52D` / `#2E2000` | Jury’s still out. |
| Contradicted | Cross | `#BD352C` / `#FFFFFF` | Spectacular miss. |

- Mixed evidence states which parts are supported and which conflict or remain uncertain. Insufficient evidence states what the available record could not establish.
- Preserve the exact claim, the finding, and the available cited sources. Let people open the cited exhibit from the result. If no source was found, explain the gap and omit the source link. Keep calculations and caveats accessible where the assessment contains them.
- Checking, technical failure and not checkable have their own text and neutral treatment. Announce status changes through a stable live region. When a verdict has a visible label, its icon and decorative reaction can be hidden from screen readers.

## Art direction and motion

Keep light reading surfaces for product UI. For campaign scenes, use the Night Broadcast navy set, cool blue bounce, and warm ivory spotlight. The [character sheets](night-broadcast/ASSETS.md) guide the full judge’s rounded rectangular glasses, robe, proportions and poses. Use neutral feather shading and warm or blue light for new artwork. Use the [blue-lit mascot](night-broadcast/Artwork/pigeon-judge.png) for the shared product artwork.

The exhibit arrives before the reaction. Follow the [motion notes](night-broadcast/Motion/Timing%20and%20performance.txt) for stamp, held gavel and splat. The contradicted sequence runs about 3 seconds, with the ivory splat at about 2.2 seconds on the edge of the claim bubble. Keep the claim, verdict and sources readable. For reduced motion, use one static pose and show the result immediately. Keep repeat reactions compact and make the performance legible in silence.

The two Chrome panels use compact portraits from the [original expression sheet](night-broadcast/References/13-character-expressions.png). Attentive listening accompanies gathering evidence, and one-eye reading accompanies examining it. A supported result gets the stamp triumph, the two uncertainty labels share the over-the-glasses peer, and a contradicted result gets the discrepancy reaction. The portraits are static and decorative. Verdict text, symbols and sources remain available.

## Product surfaces and concepts

- **Chrome side panel:** prioritize the quote, label, finding and source in a single column. Allow expansion for context and evidence. Check at 320 and 400 CSS px with keyboard focus and long multilingual content.
- **Web results:** apply the same verdict labels and evidence rules at mobile and desktop widths.
- **Share cards and post-debate speaker report:** design concepts in the brand book. Compare speakers using the same labels, scale and visual weight. Use actual totals and counts when data exists, and a stable ordering such as speaking order. Tag the library timetable and “12 claims checked” example **Fictional demo**. Test the side panel pattern before extending it to these surfaces.

## Local validation

Validated on 2026-11-21 from baseline `81f6e51` with the identity and focus changes in this branch. The web build, both extension builds, lint, type checking, and all 87 automated tests passed. A browser check exercised the text side panel at 320 and 400 CSS px with isolated fictional fixtures. It covered all four verdicts, checking, technical failure, not checkable, keyboard focus and expansion, visible cited sources, a result with no source, and Spanish and Catalan text wrapping. The motion section describes the intended performance for future animation work.

The expression update was checked in both Chrome panels at 320 and 400 CSS px. The checks covered all five portraits, the reading transition, four distinct verdict labels and markers, source links, keyboard expansion, and the absence of portraits for technical failures and noncheckable claims. Lint, type checking, the web and extension builds, and all 87 automated tests passed.
