import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RegistryProvider, useAtom } from "@effect-atom/atom-react";
import { Effect } from "effect";
import { BadgeCheck, ExternalLink, LoaderCircle, Plus } from "lucide-react";
import { MAX_TEXT_CHARACTERS } from "@council/contracts";
import type { Claim } from "@council/contracts";
import {
  BrandMark,
  ClaimOverview,
  ClaimPreview,
  CheckabilityNotice,
  ClaimCard,
  ExplanationLanguageControl,
  RetryAction,
} from "@council/ui";
import { api, submitOnce } from "./api";
import { API_ORIGIN } from "./config";
import { storeSelection, tabCheckKey } from "./messages";
import { claimState, runState } from "./state";
import { useTabCheck } from "./use-tab-check";
import "./styles.css";
import "@council/ui/theme.css";

type Filter = "all" | "checking" | "reviewed";

function pending(claim: Claim) {
  return ["awaiting_research", "researching", "assessing"].includes(claim.status);
}

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
  const [state, setState] = useAtom(claimState(`${runId}/${claim.claimId}`));
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Effect.runPromise(
      api.loadClaim(runId, claim.claimId, controller.signal).pipe(Effect.either),
    ).then((result) => {
      if (controller.signal.aborted) return;
      setState(result._tag === "Right" ? { detail: result.right } : { error: result.left.message });
    });
    return () => controller.abort();
  }, [runId, claim.claimId, revision, retry, setState]);
  return (
    <details className={`result-item result-${claim.verdict ?? claim.status}`}>
      <summary>
        <ClaimPreview claim={claim} />
      </summary>
      <ClaimCard claim={claim} detail={state.detail} detailError={state.error} />
      {claim.status === "error" ? (
        <RetryAction
          revision={retryRevision}
          claimId={claim.claimId}
          label="Retry this claim"
          onRetry={(request) => Effect.runPromise(api.retryRun(runId, request))}
          onAccepted={onMutation}
        />
      ) : null}
      {state.error ? (
        <button className="detail-retry" onClick={() => setRetry((value) => value + 1)}>
          Retry loading analysis
        </button>
      ) : null}
    </details>
  );
}

function Results({
  textLength,
  runId,
  filter,
  setFilter,
}: {
  textLength: number;
  runId: string;
  filter: Filter;
  setFilter: (filter: Filter) => void;
}) {
  const [state, setState] = useAtom(runState(runId));
  const [refresh, setRefresh] = useState(0);
  const [observation, setObservation] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const result = await Effect.runPromise(
        api.loadRun(runId, controller.signal).pipe(Effect.either),
      );
      if (controller.signal.aborted) return;
      if (result._tag === "Left") {
        setState((previous) => ({ ...previous, error: result.left.message }));
        return;
      }
      setState({ run: result.right });
      setObservation((value) => value + 1);
      if (
        result.right.translation?.status === "processing" ||
        ["queued", "awaiting_processing", "extracting", "processing"].includes(result.right.status)
      )
        timer = setTimeout(poll, 2000);
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [runId, refresh, setState]);
  const run = state.run;
  const claims = run?.claims ?? [];
  const checking = claims.filter(pending).length;
  const reviewed = claims.length - checking;
  const filtered = claims.filter(
    (claim) => filter === "all" || (filter === "checking" ? pending(claim) : !pending(claim)),
  );
  const terminal = run && ["complete", "error"].includes(run.status);

  return (
    <>
      {textLength > 5000 || claims.length > 8 ? (
        <aside className="web-handoff">
          <p>Longer passage? Follow all claims and compare evidence in the web app.</p>
          <a href={`${API_ORIGIN}/runs/${runId}`} target="_blank" rel="noreferrer">
            Continue in web app <ExternalLink size={13} />
          </a>
        </aside>
      ) : null}
      {run ? (
        <ExplanationLanguageControl
          key={runId}
          run={run}
          onChangeLanguage={(request) => Effect.runPromise(api.changeLanguage(runId, request))}
          onAccepted={() => setRefresh((value) => value + 1)}
        />
      ) : null}
      {run && (run.status === "error" || run.errorCount > 0) ? (
        <RetryAction
          key={`retry-${runId}`}
          revision={observation}
          onRetry={(request) => Effect.runPromise(api.retryRun(runId, request))}
          onAccepted={() => setRefresh((value) => value + 1)}
        />
      ) : null}
      <CheckabilityNotice checkability={run?.checkability} />
      <section className="check-overview">
        {run?.extraction ? (
          <p className="pipeline-status" role="status">
            Finding claims: {run.extraction.completedChunks} / {run.extraction.totalChunks} text
            sections{run.extraction.done ? " · finished" : " · more claims may appear"}.<br />
            Checking claims: {reviewed} / {claims.length} finished.
          </p>
        ) : null}
        <ClaimOverview claims={claims} />
      </section>
      <nav className="filters" aria-label="Filter claims">
        {(["all", "checking", "reviewed"] as const).map((value) => (
          <button
            key={value}
            className={filter === value ? "selected" : ""}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value === "all" ? "All" : value === "checking" ? "Checking" : "Reviewed"}
            <span>
              {value === "all" ? claims.length : value === "checking" ? checking : reviewed}
            </span>
          </button>
        ))}
      </nav>
      {state.error ? (
        <div className="notice error" role="alert">
          <p>{state.error}</p>
          <button onClick={() => setRefresh((value) => value + 1)}>Retry connection</button>
        </div>
      ) : null}
      {run?.error ? (
        <p className="notice error" role="alert">
          {run.error}
        </p>
      ) : null}
      {run && run.errorCount > 0 ? (
        <p className="notice error">
          {run.errorCount} claim{run.errorCount === 1 ? "" : "s"} could not be checked. Available
          results are shown.
        </p>
      ) : null}
      {run?.extraction?.warnings?.length ? (
        <aside className="notice extraction-warnings" role="status">
          <strong>Extraction warnings</strong>
          <ul>
            {run.extraction.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </aside>
      ) : null}
      <section className="results" aria-label="Claim results">
        {filtered.map((claim) => (
          <ClaimResult
            key={claim.claimId}
            runId={runId}
            claim={claim}
            revision={run?.revision ?? 0}
            retryRevision={observation}
            onMutation={() => setRefresh((value) => value + 1)}
          />
        ))}
        {!claims.length && !state.error ? (
          <div className="empty-state">
            {!terminal ? <LoaderCircle size={23} className="spin" /> : <BadgeCheck size={27} />}
            <p>
              {terminal
                ? run?.extraction?.warnings?.length
                  ? "No source-linked claims are available. Review extraction warnings and original text."
                  : "No checkable factual claims were found in this text."
                : run?.status === "extracting"
                  ? "Finding factual claims in your text…"
                  : "Preparing your check…"}
            </p>
          </div>
        ) : null}
        {claims.length > 0 && !filtered.length ? (
          <p className="notice muted">No claims in this filter.</p>
        ) : null}
      </section>
      <footer className="panel-footer">
        <span className="footer-state">
          {terminal
            ? "Check finished"
            : run?.extraction && !run.extraction.done
              ? "Finding and checking claims"
              : "Checking automatically"}
        </span>
        <a href={`${API_ORIGIN}/runs/${runId}`} target="_blank" rel="noreferrer">
          Open in web app <ExternalLink size={13} />
        </a>
      </footer>
    </>
  );
}

function Panel() {
  const { tab, check, error: storedError, loading } = useTabCheck();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<"auto" | "en" | "es" | "ca">("auto");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const key = check?.submission.submissionKey;
  const receipt = check?.receipt;

  useEffect(() => {
    setText(check?.submission.text ?? "");
    setLanguage(check?.submission.explanationLanguage ?? "auto");
    setError(undefined);
    setFilter("all");
    setSaving(false);
  }, [key, tab?.id]);

  useEffect(() => {
    if (!check || receipt) {
      setSaving(false);
      return;
    }
    let active = true;
    setSaving(true);
    setError(undefined);
    void submitOnce(check.submission)
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : "Could not submit this text.");
      })
      .finally(() => {
        if (active) setSaving(false);
      });
    return () => {
      active = false;
    };
  }, [key, tab?.id, receipt?.runId, retry]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (tab?.id === undefined || !text.trim() || Array.from(text).length > MAX_TEXT_CHARACTERS)
      return;
    const url = tab.url && /^https?:\/\//i.test(tab.url) ? tab.url : undefined;
    await storeSelection(tab.id, {
      submissionKey: crypto.randomUUID(),
      text,
      ...(language !== "auto" ? { explanationLanguage: language } : {}),
      ...(url ? { source: { url, title: tab.title } } : {}),
    });
  }

  async function newCheck() {
    if (tab?.id === undefined) return;
    await chrome.storage.local.remove(tabCheckKey(tab.id));
    setText("");
    setError(undefined);
  }

  const sourceUrl = check?.submission.source?.url ?? tab?.url;
  const host =
    sourceUrl && /^https?:\/\//i.test(sourceUrl) ? new URL(sourceUrl).hostname : "Selected text";

  return (
    <div className="panel">
      <header className="panel-header">
        <span className="brand">
          <span className="brand-mark">
            <BrandMark />
          </span>{" "}
          Wingman
        </span>
        {receipt ? (
          <button
            className="icon-button"
            onClick={() => void newCheck()}
            aria-label="New check"
            title="New check"
          >
            <Plus size={18} />
          </button>
        ) : null}
      </header>
      <section className="source-context">
        <div className="source-meta">
          <span className="source-mode">TEXT</span>
          <span>{host}</span>
        </div>
        <p className="source-title">
          {check?.submission.source?.title ??
            tab?.title ??
            "Check factual claims alongside the page"}
        </p>
      </section>
      {receipt ? (
        <Results
          textLength={Array.from(check.submission.text).length}
          runId={receipt.runId}
          filter={filter}
          setFilter={setFilter}
        />
      ) : (
        <section className="composer">
          <h1>{saving ? "Starting your check" : "Check a passage"}</h1>
          <p className="muted">
            Select text on a page, right-click and choose “Check claims”, or paste it here.
          </p>
          <form onSubmit={(event) => void submit(event)}>
            <label htmlFor="check-text">Text to check</label>
            <textarea
              id="check-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste a statement or passage…"
              disabled={saving}
            />
            <div className="composer-options">
              <label htmlFor="language">Explanation</label>
              <select
                id="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value as typeof language)}
                disabled={saving}
              >
                <option value="auto">Match input language</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="ca">Català</option>
              </select>
            </div>
            <p className="character-count">
              {Array.from(text).length.toLocaleString()} / 200,000 characters
            </p>
            {error ? (
              <div className="error" role="alert">
                <p>{error}</p>
                <button type="button" onClick={() => setRetry((value) => value + 1)}>
                  Retry submission
                </button>
              </div>
            ) : null}
            {storedError ? (
              <p className="error" role="alert">
                {storedError}
              </p>
            ) : null}
            <button
              className="primary"
              type="submit"
              disabled={
                saving ||
                loading ||
                tab?.id === undefined ||
                !text.trim() ||
                Array.from(text).length > MAX_TEXT_CHARACTERS
              }
            >
              {saving ? <LoaderCircle size={16} className="spin" /> : <BadgeCheck size={16} />}{" "}
              {saving ? "Starting…" : "Check text"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RegistryProvider>
      <Panel />
    </RegistryProvider>
  </StrictMode>,
);
