import { useEffect } from "react";
import { useAtom } from "@effect-atom/atom-react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { Effect } from "effect";
import type { Claim, Run } from "@council/contracts";
import { ClaimCard } from "@council/ui";
import { loadClaim, loadRun } from "../services/api";
import { claimDetailState, runState, needsRunPolling } from "../state/run";

function ClaimResult({
  runId,
  claim,
  revision,
}: {
  runId: string;
  claim: Claim;
  revision: number;
}) {
  const [state, setState] = useAtom(claimDetailState(`${runId}/${claim.claimId}`));
  useEffect(() => {
    const controller = new AbortController();
    void Effect.runPromise(
      loadClaim(runId, claim.claimId, controller.signal).pipe(Effect.either),
    ).then((result) => {
      if (controller.signal.aborted) return;
      if (result._tag === "Right") setState({ detail: result.right });
      else setState((previous) => ({ ...previous, error: result.left.message }));
    });
    return () => controller.abort();
  }, [runId, claim.claimId, revision, setState]);
  return <ClaimCard claim={claim} detail={state.detail} detailError={state.error} />;
}

function progressTitle(run: Run) {
  if (run.status === "error") return "Checking failed";
  if (run.status === "queued") return "Preparing submission";
  if (run.status === "extracting") return "Finding factual claims";
  if (run.status === "processing") return "Researching and checking claims";
  if (run.status === "complete")
    return run.errorCount > 0 ? "Checking finished with errors" : "Checking complete";
  return "Awaiting processing";
}

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
      if (needsRunPolling(result.right)) timer = setTimeout(refresh, 2000);
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
              <strong>{progressTitle(state.run)}</strong>
              {state.run.error ? (
                <p className="error" role="alert">
                  {state.run.error}
                </p>
              ) : state.run.status === "extracting" ? (
                <p>
                  {state.run.extraction?.completedChunks ?? 0} of{" "}
                  {state.run.extraction?.totalChunks ?? 0} passages processed.
                </p>
              ) : state.run.claims.length ? (
                <p>
                  {
                    state.run.claims.filter(
                      (claim) => claim.status === "complete" || claim.status === "not_checkable",
                    ).length
                  }{" "}
                  of {state.run.claims.length} claims checked.
                </p>
              ) : state.run.status === "complete" ? (
                <p>No checkable factual claims were found.</p>
              ) : (
                <p>Your original text is saved.</p>
              )}
              {state.run.errorCount > 0 ? (
                <p className="error">
                  {state.run.errorCount} claim{state.run.errorCount === 1 ? "" : "s"} could not be
                  checked. Other results remain available.
                </p>
              ) : null}
            </div>
          </section>
          {state.run.claims.length ? (
            <section className="claims-list" aria-label="Claims and assessments">
              <h2>Factual claims</h2>
              {state.run.claims.map((claim) => (
                <ClaimResult
                  key={claim.claimId}
                  runId={runId}
                  claim={claim}
                  revision={state.run.revision}
                />
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
