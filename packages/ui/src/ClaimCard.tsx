import type { Claim, ClaimDetail } from "@council/contracts";
import { AssessmentView } from "./AssessmentView";
import { EvidenceList } from "./EvidenceList";

const statusLabels: Record<Claim["status"], string> = {
  awaiting_research: "Awaiting research",
  researching: "Researching evidence",
  assessing: "Assessing evidence",
  complete: "Complete",
  error: "Checking failed",
  not_checkable: "Not checkable",
};

export function ClaimCard({
  claim,
  detail,
  detailError,
}: {
  claim: Claim;
  detail?: ClaimDetail;
  detailError?: string;
}) {
  return (
    <article className="surface claim" id={`claim-${claim.claimId}`}>
      <p className="claim-status" role="status">
        {statusLabels[claim.status]}
      </p>
      <h3>{claim.assertion}</h3>
      <blockquote>{claim.quote}</blockquote>
      {claim.speaker || claim.startSeconds !== undefined ? (
        <p className="muted">
          {claim.speaker}
          {claim.startSeconds !== undefined ? ` · ${claim.startSeconds}s` : ""}
        </p>
      ) : null}
      {claim.error ? (
        <p className="error" role="alert">
          {claim.error}
        </p>
      ) : null}
      {detailError ? (
        <p className="error" role="alert">
          {detailError}
        </p>
      ) : null}
      {detail?.assessment ? <AssessmentView assessment={detail.assessment} /> : null}
      {claim.status === "not_checkable" && detail?.research?.notes.length ? (
        <p className="muted">{detail.research.notes.join(" ")}</p>
      ) : null}
      {detail?.evidence ? (
        <EvidenceList evidence={detail.evidence} citedIds={detail.assessment?.evidenceIds} />
      ) : null}
      <details className="claim-context">
        <summary>Original context</summary>
        <p>{claim.context}</p>
      </details>
    </article>
  );
}
