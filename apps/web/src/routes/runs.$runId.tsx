import { useEffect, useState } from "react";
import { useAtom } from "@effect-atom/atom-react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { Effect } from "effect";
import type { Claim, Run } from "@council/contracts";
import {
  WingmanMascot,
  ClaimOverview,
  ClaimPreview,
  CheckabilityNotice,
  ClaimCard,
  ExplanationLanguageControl,
  RetryAction,
} from "@council/ui";
import { loadClaim, loadRun, retryRun, changeLanguage } from "../services/api";
import { claimDetailState, runState, needsRunPolling } from "../state/run";

function ClaimResult({
  runId,
  claim,
  revision,
  retryRevision,
  onMutation,
}: {
  runId: string;
  claim: Claim;
  revision: number;
  retryRevision: number;
  onMutation: () => void;
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
  return (
    <div>
      <details className={`result-item result-${claim.verdict ?? claim.status}`}>
        <summary>
          <ClaimPreview claim={claim} />
        </summary>
        <ClaimCard claim={claim} detail={state.detail} detailError={state.error} />
      </details>
      {claim.status === "error" ? (
        <RetryAction
          revision={retryRevision}
          claimId={claim.claimId}
          label="Retry this claim"
          onRetry={(request) => Effect.runPromise(retryRun(runId, request))}
          onAccepted={onMutation}
        />
      ) : null}
    </div>
  );
}

function progressTitle(run: Run) {
  if (run.status === "error") return "Checking failed";
  if (run.status === "queued") return "Preparing submission";
  if (
    (run.status === "extracting" || run.status === "processing") &&
    run.extraction &&
    !run.extraction.done
  )
    return "Finding and checking factual claims";
  if (run.status === "extracting") return "Finding factual claims";
  if (run.status === "processing") return "Researching and checking claims";
  if (run.status === "complete")
    return run.errorCount > 0 ? "Checking finished with errors" : "Checking complete";
  return "Awaiting processing";
}

export function SavedSubmissionPage() {
  const { runId } = useParams({ strict: false }) as { runId: string };
  const [state, setState] = useAtom(runState(runId));
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState<"all" | "checking" | "reviewed">("all");
  const [observation, setObservation] = useState(0);
  const onMutation = () => setRefreshKey((value) => value + 1);

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
      setObservation((value) => value + 1);
      if (needsRunPolling(result.right)) timer = setTimeout(refresh, 2000);
    }
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [runId, refreshKey, setState]);

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
          <section className="intro report-intro">
            <WingmanMascot className="report-mascot" />
            <div className="saved-label">
              <Check size={16} /> Text saved
            </div>
            <h1>
              {state.run.status === "complete" ? "The evidence is in." : "Your evidence desk."}
            </h1>
            <p>Saved {new Date(state.run.createdAt).toLocaleString()}</p>
          </section>
          <ExplanationLanguageControl
            key={runId}
            run={state.run}
            onChangeLanguage={(request) => Effect.runPromise(changeLanguage(runId, request))}
            onAccepted={onMutation}
          />
          {state.run.status === "error" || state.run.errorCount > 0 ? (
            <RetryAction
              key={`retry-${runId}`}
              revision={observation}
              onRetry={(request) => Effect.runPromise(retryRun(runId, request))}
              onAccepted={onMutation}
            />
          ) : null}
          <CheckabilityNotice checkability={state.run.checkability} />
          <section className="status-note" role="status">
            <span className="status-dot" />
            <div>
              <strong>{progressTitle(state.run)}</strong>
              {state.run.error ? (
                <p className="error" role="alert">
                  {state.run.error}
                </p>
              ) : null}
              <div className="pipeline-progress">
                {state.run.extraction ? (
                  <p>
                    Finding claims: {state.run.extraction.completedChunks} /{" "}
                    {state.run.extraction.totalChunks} text sections processed
                    {state.run.extraction.done ? " · finished" : " · more claims may appear"}.
                  </p>
                ) : null}
                {state.run.claims.length ? (
                  <p>
                    Checking claims:{" "}
                    {
                      state.run.claims.filter((claim) =>
                        ["complete", "not_checkable", "error"].includes(claim.status),
                      ).length
                    }{" "}
                    / {state.run.claims.length} finished.
                    {state.run.extraction && !state.run.extraction.done
                      ? " Results appear while the remaining text is read."
                      : ""}
                  </p>
                ) : state.run.status === "complete" ? (
                  <p>
                    {state.run.extraction?.warnings?.length
                      ? "No source-linked claims are available. Review extraction warnings and original text."
                      : "No checkable factual claims were found."}
                  </p>
                ) : (
                  <p>Your original text is saved.</p>
                )}
              </div>
              {state.run.errorCount > 0 ? (
                <p className="error">
                  {state.run.errorCount} claim{state.run.errorCount === 1 ? "" : "s"} could not be
                  checked. Other results remain available.
                </p>
              ) : null}
            </div>
          </section>
          {state.run.extraction?.warnings?.length ? (
            <aside className="notice extraction-warnings" role="status">
              <strong>Extraction warnings</strong>
              <ul>
                {state.run.extraction.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </aside>
          ) : null}
          {state.run.claims.length ? (
            <section className="claims-list" aria-label="Claims and assessments">
              <h2>Factual claims</h2>
              <ClaimOverview claims={state.run.claims} />
              <nav className="filters" aria-label="Filter claims">
                {(["all", "checking", "reviewed"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={filter === value ? "selected" : ""}
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {value === "all" ? "All" : value === "checking" ? "Checking" : "Reviewed"}
                    <span>
                      {
                        state.run.claims.filter(
                          (c) =>
                            value === "all" ||
                            (value === "checking"
                              ? ["awaiting_research", "researching", "assessing"].includes(c.status)
                              : !["awaiting_research", "researching", "assessing"].includes(
                                  c.status,
                                )),
                        ).length
                      }
                    </span>
                  </button>
                ))}
              </nav>
              {state.run.claims
                .filter(
                  (c) =>
                    filter === "all" ||
                    (filter === "checking"
                      ? ["awaiting_research", "researching", "assessing"].includes(c.status)
                      : !["awaiting_research", "researching", "assessing"].includes(c.status)),
                )
                .map((claim) => (
                  <ClaimResult
                    key={claim.claimId}
                    runId={runId}
                    claim={claim}
                    revision={state.run.revision}
                    retryRevision={observation}
                    onMutation={onMutation}
                  />
                ))}
            </section>
          ) : null}
          <section className="surface saved-text">
            <h2>Original text</h2>
            {state.run.submission.source?.title && !state.run.submission.source.url ? (
              <p>{state.run.submission.source.title}</p>
            ) : null}
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
