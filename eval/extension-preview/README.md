# Chrome side-panel preview

This unpacked extension renders the existing extracted-run fixture using the shared Run schema. It shows the exact quote and extraction status. Selection handoff, API calls and assessment rendering are part of TASK-010 after TASK-004 supplies the assessment contract.

From the repository root:

```sh
npx vite build eval/extension-preview --base ./
```

Load `eval/extension-preview/dist` via **Load unpacked** in `chrome://extensions`. Select **Council Check · Preview** from Chrome's side-panel menu.
