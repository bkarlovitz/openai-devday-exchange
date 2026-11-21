import { useEffect } from "react";
import { useAtom } from "@effect-atom/atom-react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { Effect } from "effect";
import { loadRun } from "../services/api";
import { runState, needsExtractionPolling } from "../state/run";

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
      if (needsExtractionPolling(result.right)) {
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
                {state.run.status === "error"
                  ? "Extraction failed"
                  : state.run.status === "extracting"
                    ? "Finding factual claims"
                    : state.run.status === "queued"
                      ? "Preparing submission"
                      : state.run.extraction?.done
                        ? "Extraction complete"
                        : "Awaiting processing"}
              </strong>
              {state.run.error ? (
                <p role="alert">{state.run.error}</p>
              ) : state.run.extraction?.done ? (
                <p>
                  {state.run.claims.length
                    ? `${state.run.claims.length} claims found. Evidence research is the next stage.`
                    : "No checkable factual claims were found."}
                </p>
              ) : (
                <p>
                  {state.run.extraction
                    ? `${state.run.extraction.completedChunks} of ${state.run.extraction.totalChunks} passages processed.`
                    : "Your original text is saved."}
                </p>
              )}
            </div>
          </section>
          {state.run.claims.length > 0 ? (
            <section className="claims-list" aria-label="Extracted claims">
              <h2>Factual claims</h2>
              {state.run.claims.map((claim) => (
                <article className="surface claim" key={claim.claimId}>
                  <p className="muted">Awaiting evidence research</p>
                  <h3>{claim.assertion}</h3>
                  <blockquote>{claim.quote}</blockquote>
                  {claim.speaker ? (
                    <p>
                      {claim.speaker}
                      {claim.startSeconds !== undefined ? ` · ${claim.startSeconds}s` : ""}
                    </p>
                  ) : null}
                  <details>
                    <summary>Context</summary>
                    <p>{claim.context}</p>
                  </details>
                </article>
              ))}
            </section>
          ) : null}
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
