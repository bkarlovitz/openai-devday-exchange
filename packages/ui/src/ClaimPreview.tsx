import type { Claim } from "@council/contracts";
import { verdictLabels, verdictPhrases } from "./AssessmentView";

export function ClaimPreview({ claim }: { claim: Claim }) {
  const pending = ["awaiting_research", "researching", "assessing"].includes(claim.status);
  const symbol = pending
    ? "···"
    : claim.verdict === "supported"
      ? "✓"
      : claim.verdict === "contradicted"
        ? "×"
        : claim.verdict === "mixed_evidence"
          ? "±"
          : claim.verdict === "insufficient_evidence"
            ? "?"
            : "—";
  const label = pending
    ? "Analyzing…"
    : claim.verdict
      ? verdictLabels[claim.verdict]
      : claim.status === "error"
        ? "Checking failed"
        : "Not checkable";
  return (
    <>
      <span className="preview-top">
        <span className="timestamp-badge">
          {claim.startSeconds !== undefined
            ? `▶ ${Math.floor(claim.startSeconds / 60)
                .toString()
                .padStart(2, "0")}:${Math.floor(claim.startSeconds % 60)
                .toString()
                .padStart(2, "0")}`
            : "TEXT"}
        </span>
        <span className="claim-kind">
          {claim.status === "not_checkable" ? "STATEMENT" : "FACT"}
        </span>
        {claim.speaker ? <span className="preview-speaker">{claim.speaker}</span> : null}
      </span>
      <span className="preview-main">
        <span className="preview-quote">“{claim.quote}”</span>
        <span className="category-symbol" aria-label={label}>
          {symbol}
        </span>
      </span>
      <span className="preview-bottom">
        <span className="status-chip">{label}</span>
        {!pending && claim.verdict ? (
          <span className="verdict-phrase">{verdictPhrases[claim.verdict]}</span>
        ) : null}
        <span className="preview-more">
          View analysis <span aria-hidden="true">⌄</span>
        </span>
      </span>
    </>
  );
}
