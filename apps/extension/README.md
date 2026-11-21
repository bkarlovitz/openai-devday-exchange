# Council Check extension

Build with `npm run build:extension` from the repository root. Load `apps/extension/dist` unpacked via `chrome://extensions`, or unzip the generated `dist/council-check-extension.zip`. The deployed web app serves the same package and [install instructions](https://council-checker-dev.snapnda.workers.dev/extension-install.html).

Select text on a normal web page, right-click and choose **Check claims**. The side panel automatically checks that passage. Click the toolbar icon for paste input. Each tab retains its check; reopening the panel restores its run. Transport retries retain the submission key. **Open in web app** opens the same saved run.

The visual reference is in [docs/design](../../docs/design/README.md). Shared claim, assessment and evidence views come from `@council/ui` and all network requests use the typed `@council/contracts` client. Credentials are held only by the backend.

The manifest's public key pins ID `fhfebjohcmngiobjfcamkcknhmfhafbk`. API origin is in `src/config.ts`; keep manifest host permissions and Worker EXTENSION_ORIGINS in sync when changing deployments. Rebuild and reload the unpacked extension after changes.

Actual Chromium verification covered registered selection dispatch, automatic live assessment, paste, two-tab restoration, reload, evidence expansion and shared web links. A teammate should also smoke-check the native right-click menu and toolbar icon in desktop Chrome. This package is distributed unpacked for the hackathon.
