# Wingman brand assets

The supplied originals live in `References/`, editable marks in `Marks/`, production illustrations in `Artwork/`, and animation material in `Motion/`. Keep supplied sheets intact; derive individual assets separately when needed. The original kit ZIP remains unchanged.

## Latest supplied character references — 2026-11-21

| Reference | Contents |
| --- | --- |
| [Character expressions](References/13-character-expressions.png) | Attentive listening, one-eye reading, spotting the discrepancy, the additional surprised face, deadpan camera glance, smug stamp triumph, and over-the-glasses peer; supporting stamp, gavel, glasses, screen, timetable and wing studies. |
| [Character turnaround](References/14-character-turnaround.png) | Front, three-quarter, side and back views; head, shoulder, hem and feet alignment; silhouette studies. |
| [Construction and props](References/15-character-construction-and-props.png) | Head/body construction, outline and shading examples, exhibit props, verdict cards, halftone textures, lighting and finished compositions. |

Use these supplied sheets to match character proportions, expressions and view consistency. They supplement the existing palette and typography records. The two screenshots are preserved exactly as supplied, including their on-screen controls and captions.

## Side-panel graphic revisions

- [Original supplied graphic](References/11-side-panel-and-states.png).
- [First generated character correction](References/wingman-side-panel-character-corrected.png), retained as an earlier draft with its [prompt](References/wingman-side-panel-character-corrected-prompt.txt).
- [Latest generated expression revision](References/16-side-panel-expressions-v2.png) and [exact prompt](References/16-side-panel-expressions-v2.prompt.txt), created with built-in imagegen using the newly supplied expression sheet. Mapping: attentive listening in the center and browser thumbnail; smug stamp triumph for “Checks out.”; over-the-glasses peer for “Jury’s still out.”; spotting the discrepancy for “Spectacular miss.” The current Chrome panels use portraits from the original expression sheet. The mockup records the layout explored for those portraits.

## Inventory and verification

[asset-manifest.json](asset-manifest.json) records original filenames, repository locations, dimensions, sizes, SHA-256 hashes, and whether each image is supplied or generated. All nine PNGs in the previously supplied `wingman media` folder already match existing repository references byte for byte; their existing paths are retained.

Verified locally against base commit `f26b2301266ef0ae915580f04339520fc6e73982`: byte equality for the three newly copied supplied sheets, hashes for the nine existing media originals, PNG metadata/readability, manifest paths and hashes, documentation links, and `git diff --check`. The generated revision was visually checked for the expression mapping, legible copy and retained layout. No application code changed, so application test suites were not run. The `yook` executable is unavailable in this environment; verification used local file and Git checks. No merge or deployment was performed.
