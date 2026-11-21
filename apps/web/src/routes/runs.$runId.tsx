import { useEffect } from "react";
import { useAtom } from "@effect-atom/atom-react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { Effect } from "effect";
import { loadRun } from "../services/api";
import { runState } from "../state/submission";

export function SavedSubmissionPage() {
  const { runId } = useParams({ strict: false }) as { runId: string };
  const [state, setState] = useAtom(runState(runId));

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      const result = await Effect.runPromise(loadRun(runId, controller.signal).pipe(Effect.either));
      if (controller.signal.aborted) return;
      if (result._tag === "Left") {
        setState({ status: "error", error: result.left.message });
        return;
      }
      setState({ status: "loaded", run: result.right });
      if (result.right.status === "queued") {
        timer = setTimeout(refresh, 2000);
      }
    }
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [runId, setState]);

  return (
    <main className="page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> New submission
      </Link>
      {state.status === "loading" ? (
        <p className="loading" role="status">
          <LoaderCircle size={18} className="spin" /> Loading submission…
        </p>
      ) : state.status === "error" ? (
        <div className="surface">
          <h1>Could not load submission</h1>
          <p role="alert" className="error">
            {state.error}
          </p>
          <button onClick={() => window.location.reload()}>Try again</button>
        </div>
      ) : (
        <>
          <section className="intro">
            <div className="saved-label">
              <Check size={16} /> Text saved
            </div>
            <h1>Your submission.</h1>
            <p>Saved {new Date(state.run.createdAt).toLocaleString()}</p>
          </section>
          <section className="status-note" role="status">
            <span className="status-dot" />
            <div>
              <strong>
                {state.run.status === "queued" ? "Preparing submission" : "Awaiting processing"}
              </strong>
              <p>Your text is saved. Claim extraction will be available in the next build.</p>
            </div>
          </section>
          <section className="surface saved-text">
            <h2>Original text</h2>
            {state.run.submission.source?.url ? (
              <a href={state.run.submission.source.url} target="_blank" rel="noreferrer">
                {state.run.submission.source.title ?? "Original source"}
              </a>
            ) : null}
            <p>{state.run.submission.text}</p>
          </section>
        </>
      )}
    </main>
  );
}
