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
  const characters = Array.from(draft.text).length;
  const tooLong = characters > MAX_TEXT_CHARACTERS;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state.pending) return;
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
        <p>Paste a passage from a council debate, transcript, or document.</p>
      </section>
      <form className="surface" onSubmit={submit}>
        <label htmlFor="submission-text">Text to review</label>
        <textarea
          id="submission-text"
          placeholder="Paste the original text here…"
          value={draft.text}
          disabled={state.pending}
          aria-describedby={state.error ? "submission-error" : "text-limit"}
          onChange={(event) => {
            const next = { submissionKey: crypto.randomUUID(), text: event.target.value };
            setDraft(next);
            persistDraft(next);
            setState({ pending: false });
          }}
        />
        <div className="form-bottom">
          <p id="text-limit" className={tooLong ? "error" : "muted"}>
            {characters.toLocaleString()} / {MAX_TEXT_CHARACTERS.toLocaleString()} characters
          </p>
          <button type="submit" disabled={state.pending || tooLong}>
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
        Claims are checked against official data and published sources, with evidence you can
        inspect.
      </p>
    </main>
  );
}
