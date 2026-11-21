# TASK-010: Check selected text and open shared results in a side panel

## Objective

Deliver the agreed extension workflow using the same runs and assessments as the web app.

## Milestone

M6: Chrome extension client. See the task index for the complete milestone sequence.

## Why

This capability advances the agreed text-to-assessment workflow in .viktor/specs/council-claim-checker.md.

## Requirements

- Create apps/extension/manifest.json with MV3 service worker, selection context menu, sidePanel/storage permissions, and API-origin host permissions. Add compatible Vite build and extension build/dev scripts.
- Implement background.ts, sidepanel.tsx, and message contracts. From a user context-menu gesture, open the side panel, transfer selected text with page URL/title, submit automatically once, and show shared ClaimCard/AssessmentView components.
- Retain draft and active run IDs in chrome.storage across panel suspension. Multiple tabs or repeated user gestures must not submit the same handoff twice or display a stale selection. Include paste fallback for pages without selection access.
- Configure extension API origin and installed extension ID. Add API CORS for exact configured origins including OPTIONS requests. Keep API credentials server-side.
- Add Open in web app using the exact run ID. Reflect polling progress, partial errors, retry, and language selection. Show transport errors with a usable retry action.

- Declare contextMenus explicitly. Generate one submissionKey per selection or pasted submission, persist it before transport, and reuse it after network failure. A genuinely new user action gets a new key. Reuse commandId on transport retries for language/retry mutations.

## Implementation Notes

Depends on TASK-009; the ordered index assumes all earlier tasks are complete. All application paths are proposed additions. Read .viktor/architecture.md before implementing.

Reuse packages/ui components and contracts. Poll through the same API client abstraction. Validate the user-gesture opening path against current Chrome APIs during implementation.

## Validation

Build and load the unpacked extension in desktop Chrome. Select text on a normal page, invoke Check claims, and verify automatic submission and progressive results. Close/reopen the panel, test two tabs and paste fallback, switch language, and open the same run in the web app. Inspect that the package contains no API key.

## Completion Notes

When complete, set done to true for this task in .viktor/tasks.json, append actual changes and validation evidence to .viktor/logs/LOG.md, and create one git commit. Follow any configured Viktor completion-tag convention. Never mark validation complete when credentials or external access prevented it.
