import type { Claim, Verdict } from "@council/contracts";
import { verdictLabels, verdictPhrases } from "./AssessmentView";

const verdictVisuals: Record<Verdict, { expression: string; symbol: string }> = {
  supported: { expression: "supported", symbol: "✓" },
  contradicted: { expression: "contradicted", symbol: "×" },
  mixed_evidence: { expression: "uncertain", symbol: "±" },
  insufficient_evidence: { expression: "uncertain", symbol: "?" },
};

const gathering = { expression: "listening", label: "Gathering evidence…" };
const checkingStages: Partial<Record<Claim["status"], typeof gathering>> = {
  awaiting_research: gathering,
  researching: gathering,
  assessing: { expression: "reading", label: "Examining evidence…" },
};

export function ClaimPreview({
  claim,
  showExpression = false,
}: {
  claim: Claim;
  showExpression?: boolean;
}) {
  const checking = checkingStages[claim.status];
  const verdict = claim.verdict;
  const visual = verdict ? verdictVisuals[verdict] : undefined;
  const expression =
    checking?.expression ?? (claim.status === "complete" ? visual?.expression : undefined);
  const symbol = checking ? "···" : (visual?.symbol ?? "—");
  const label = checking
    ? showExpression
      ? checking.label
      : "Analyzing…"
    : verdict
      ? verdictLabels[verdict]
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
        <span
          className="claim-reaction"
          data-expression={showExpression ? expression : undefined}
          aria-hidden="true"
        >
          <span className="category-symbol reaction-symbol">{symbol}</span>
        </span>
      </span>
      <span className="preview-bottom">
        <span className="status-chip">{label}</span>
        {!checking && verdict ? (
          <span className="verdict-phrase">{verdictPhrases[verdict]}</span>
        ) : null}
        <span className="preview-more">
          View analysis <span aria-hidden="true">⌄</span>
        </span>
      </span>
    </>
  );
}
