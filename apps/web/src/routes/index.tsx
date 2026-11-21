import { useRef, useState } from "react";
import type { Submission } from "@council/contracts";
import { inferTranscriptPassages } from "../services/transcript";
import { useAtom } from "@effect-atom/atom-react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Effect } from "effect";
import { MAX_TEXT_CHARACTERS } from "@council/contracts";
import { saveSubmission } from "../services/api";
import { draftAtom, persistDraft, saveStateAtom } from "../state/submission";

export function SubmissionPage() {
  const [draft, setDraft] = useAtom(draftAtom);
  const [state, setState] = useAtom(saveStateAtom);
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [importedFile, setImportedFile] = useState<string>();
  const importRevision = useRef(0);

  function updateDraft(changes: Partial<Submission>) {
    const next = { ...draft, ...changes, submissionKey: crypto.randomUUID() };
    setDraft(next);
    persistDraft(next);
    setState({ pending: false });
  }

  async function importFile(file?: File) {
    if (!file) return;
    const revision = ++importRevision.current;
    if (!/\.(txt|srt|vtt)$/i.test(file.name) || file.size > MAX_TEXT_CHARACTERS * 4) {
      setState({
        pending: false,
        error: "Choose a .txt, .srt or .vtt file containing at most 200,000 characters.",
      });
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      if (revision !== importRevision.current) return;
      updateDraft({ text, passages: inferTranscriptPassages(text) });
      setImportedFile(file.name);
    } catch {
      if (revision === importRevision.current)
        setState({
          pending: false,
          error: "Could not read this file. Try pasting its text instead.",
        });
    } finally {
      if (revision === importRevision.current) setImporting(false);
    }
  }
  const characters = Array.from(draft.text).length;
  const tooLong = characters > MAX_TEXT_CHARACTERS;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state.pending || importing) return;
    if (!draft.text.trim() || tooLong) {
      setState({ pending: false, error: "Enter text containing 1 to 200,000 characters." });
      return;
    }
    persistDraft(draft);
    setState({ pending: true });
    const result = await Effect.runPromise(saveSubmission(draft).pipe(Effect.either));
    if (result._tag === "Left") {
      setState({ pending: false, error: result.left.message });
      return;
    }
    setState({ pending: false });
    await navigate({ to: "/runs/$runId", params: { runId: result.right.runId } });
  }

  return (
    <main className="page">
      <section className="intro">
        <h1>Start with the statement.</h1>
        <p>Paste text or import a transcript from a council debate, video, or document.</p>
      </section>
      <form className="surface" onSubmit={submit}>
        <div className="transcript-import">
          <label htmlFor="transcript-file">Import text or subtitles</label>
          <input
            id="transcript-file"
            type="file"
            accept=".txt,.srt,.vtt,text/plain,text/vtt"
            disabled={state.pending || importing}
            onChange={(event) => {
              void importFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <p className="muted">
            {importing
              ? "Reading file…"
              : importedFile
                ? `Imported ${importedFile}.`
                : "Supports .txt, .srt and .vtt. You can also paste below."}{" "}
            Original text is retained; recognized subtitle timestamps and speaker labels provide
            context.
          </p>
        </div>
        <label htmlFor="submission-text">Text to review</label>
        <textarea
          id="submission-text"
          placeholder="Paste the original text here…"
          value={draft.text}
          disabled={state.pending || importing}
          aria-describedby={state.error ? "submission-error" : "text-limit"}
          onChange={(event) => {
            importRevision.current++;
            setImportedFile(undefined);
            updateDraft({
              text: event.target.value,
              passages: inferTranscriptPassages(event.target.value),
            });
          }}
        />
        {draft.passages?.length ? (
          <p className="muted">{draft.passages.length} timestamped passages recognized.</p>
        ) : null}
        <details className="submission-options">
          <summary>Source and explanation language (optional)</summary>
          <label htmlFor="source-url">Source URL</label>
          <input
            id="source-url"
            type="url"
            placeholder="https://…"
            value={draft.source?.url ?? ""}
            disabled={state.pending || importing}
            onChange={(event) =>
              updateDraft({ source: { ...draft.source, url: event.target.value || undefined } })
            }
          />
          <label htmlFor="source-title">Source title</label>
          <input
            id="source-title"
            value={draft.source?.title ?? ""}
            disabled={state.pending || importing}
            onChange={(event) =>
              updateDraft({ source: { ...draft.source, title: event.target.value || undefined } })
            }
          />
          <label htmlFor="explanation-language">Explanation language</label>
          <select
            id="explanation-language"
            value={draft.explanationLanguage ?? "auto"}
            disabled={state.pending || importing}
            onChange={(event) =>
              updateDraft({
                explanationLanguage:
                  event.target.value === "auto"
                    ? undefined
                    : (event.target.value as "en" | "es" | "ca"),
              })
            }
          >
            <option value="auto">Match input language</option>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="ca">Català</option>
          </select>
        </details>
        <div className="form-bottom">
          <p id="text-limit" className={tooLong ? "error" : "muted"}>
            {characters.toLocaleString()} / {MAX_TEXT_CHARACTERS.toLocaleString()} characters
          </p>
          <button
            type="submit"
            disabled={state.pending || importing || tooLong || !draft.text.trim()}
          >
            {state.pending ? <LoaderCircle size={17} className="spin" /> : null}
            {state.pending ? "Starting…" : "Check claims"}
            {!state.pending ? <ArrowRight size={17} /> : null}
          </button>
        </div>
        {state.error ? (
          <p id="submission-error" role="alert" className="error">
            {state.error}
          </p>
        ) : null}
      </form>
      <p className="scope-note">
        Check selected text from any page with the Chrome extension.{" "}
        <a href="/downloads/council-check-extension.zip" download>
          Download extension
        </a>
        {" · "}
        <a href="/extension-install.html">Installation instructions</a>
      </p>
      <p className="scope-note">
        Claims are checked against official data and published sources, with evidence you can
        inspect.
      </p>
    </main>
  );
}
