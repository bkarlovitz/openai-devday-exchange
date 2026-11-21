import { useEffect, useRef, useState } from "react";
import type { Run, RetryCommand, LanguageCommand } from "@council/contracts";

type Language = "en" | "es" | "ca";
type RetryRequest = RetryCommand;
type LanguageRequest = LanguageCommand;

export function RetryAction({
  onRetry,
  onAccepted,
  claimId,
  revision,
  label = "Retry failed stages",
}: {
  onRetry: (request: RetryRequest) => Promise<unknown>;
  onAccepted: () => void;
  claimId?: string;
  revision: number;
  label?: string;
}) {
  const command = useRef<RetryRequest | undefined>(undefined);
  const busy = useRef(false);
  const [state, setState] = useState<{ pending?: boolean; error?: string; accepted?: boolean }>({});
  useEffect(() => {
    setState((previous) => (previous.accepted ? {} : previous));
  }, [revision, claimId]);
  async function retry() {
    if (busy.current) return;
    busy.current = true;
    const request = command.current ?? {
      commandId: crypto.randomUUID(),
      ...(claimId ? { claimId } : {}),
    };
    command.current = request;
    setState({ pending: true });
    try {
      await onRetry(request);
      command.current = undefined;
      setState({ accepted: true });
      onAccepted();
    } catch (cause) {
      setState({ error: cause instanceof Error ? cause.message : "Could not request retry." });
    } finally {
      busy.current = false;
    }
  }
  return (
    <div className="retry-action">
      <button type="button" onClick={() => void retry()} disabled={state.pending || state.accepted}>
        {state.pending
          ? "Requesting retry…"
          : state.accepted
            ? "Retry requested"
            : state.error
              ? "Retry connection"
              : label}
      </button>
      {state.error ? (
        <p className="error" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

export function ExplanationLanguageControl({
  run,
  onChangeLanguage,
  onAccepted,
}: {
  run: Run;
  onChangeLanguage: (request: LanguageRequest) => Promise<unknown>;
  onAccepted: () => void;
}) {
  const current =
    run.explanationLanguage ?? run.submission.explanationLanguage ?? run.detectedLanguage ?? "en";
  const [language, setLanguage] = useState<Language>(current);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const command = useRef<LanguageRequest | undefined>(undefined);
  const busy = useRef(false);
  useEffect(() => {
    setLanguage(current);
  }, [current]);
  async function change(language: Language, replay = false) {
    if (busy.current) return;
    busy.current = true;
    const request =
      replay && command.current ? command.current : { commandId: crypto.randomUUID(), language };
    command.current = request;
    setLanguage(request.language);
    setPending(true);
    setError(undefined);
    try {
      await onChangeLanguage(request);
      command.current = undefined;
      onAccepted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change explanation language.");
    } finally {
      setPending(false);
      busy.current = false;
    }
  }
  return (
    <section className="explanation-language">
      <label>
        Explanation language{" "}
        <select
          aria-label="Explanation language"
          value={language}
          disabled={pending}
          onChange={(event) => void change(event.target.value as Language)}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="ca">Català</option>
        </select>
      </label>
      {pending ? <p role="status">Updating language…</p> : null}
      {run.translation?.status === "processing" ? (
        <p role="status">
          Updating explanations: {run.translation.pendingCount} remaining. Available explanations
          stay visible.
        </p>
      ) : null}
      {run.translation && run.translation.errorCount > 0 ? (
        <div className="error">
          <p>
            {run.translation.errorCount} explanation{run.translation.errorCount === 1 ? "" : "s"}{" "}
            could not be updated.
          </p>
          <button type="button" disabled={pending} onClick={() => void change(language)}>
            Retry explanation update
          </button>
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="error">
          <p>{error}</p>
          <button type="button" disabled={pending} onClick={() => void change(language, true)}>
            Retry language request
          </button>
        </div>
      ) : null}
    </section>
  );
}
