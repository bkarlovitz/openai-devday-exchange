import type { Claim } from "@council/contracts";
import { verdictLabels } from "./AssessmentView";

export function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <rect width="30" height="30" rx="8" fill="#1B1B19" />
      <circle cx="13" cy="12.5" r="6.5" stroke="white" strokeWidth="1.8" />
      <path
        d="m17.7 17.2 4.3 4.3M10.3 12.5l1.8 1.8 3.3-3.4"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
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
        <span className="preview-more">
          View analysis <span aria-hidden="true">⌄</span>
        </span>
      </span>
    </>
  );
}
