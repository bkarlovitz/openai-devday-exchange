# Wingman UI brand application

Applied on 2026-11-21 from Romina’s supplied pigeon judge references. The Chrome extensions were the priority deliverable.

Ivory #fff5df, ink navy #112344 and sky #47b1e4. Local Archivo display, IBM Plex Sans body and Source Serif 4 italic editorial type, with bundled OFL licenses. Native SVG mark and PNG toolbar icons. The general extension is version 0.1.2, the YouTube extension 0.4.9. Existing extension identities and permissions are retained.

The four evidence verdicts retain their distinct labels. Branded phrases accompany them. Pending, technical failure and noncheckable states remain separate. No generated example claims or invented speaker scores were added to the product.

## Artwork

The [brand asset index](night-broadcast/ASSETS.md) records the supplied character expression sheet, four-view turnaround, construction and props sheet, original media, and generated side-panel revisions. The latest owner-supplied sheets guide character consistency; generated revisions remain design candidates until reviewed.

Mascot: `packages/ui/assets/wingman-judge.png`. Generated with the built-in imagegen tool from the supplied landing hero reference, then copied to the project. Prompt: “Isolate the friendly pigeon judge character from the reference, preserving its exact visual identity: grey pigeon with purple-pink neck edge, big dark navy eyeglasses, orange beak, dark navy judicial robe, crisp ivory neck bands. Upper-body portrait in three quarter view, one wing holding up a small ivory evidence sheet with simple lines, other wing resting down. Faithful polished 2D cartoon, bold navy outlines, subtle shading as reference. Fully transparent background. Centered full silhouette without cropping head or wing, generous transparent margin. No desk, no spotlight, no text, no typography, no labels, no UI, no scenery.”

## Verification

Implementation based on d398cc7. Local typecheck, lint, 87 tests, full web/extension/Worker dry-run build passed. Final extension builds and visual interaction checks passed after icon and verdict refinements. Screenshots and the interaction report are in `wingman-brand-evidence/`. The library timetable claims in those screenshots are fictional test fixtures, provided through isolated request interception. No live API calls were used for the visual tests.

The yook workflow named in AGENTS.md is not installed in this environment. Verification used the documented local npm commands and isolated Chrome browser checks. Updating the user’s running Chrome extension could not be verified because native Chrome control timed out. Ready packages are in `apps/web/public/downloads/wingman-extension.zip` and `wingman-youtube.zip`. Unpacked versions are under each extension’s `dist/`. The website has not been deployed.
