import type { Claim, ClaimDetail, ResearchResult } from "@council/contracts";

/** Only the explicit recovery selection may be scheduled by a claim retry. */
export function selectRecoveryClaims(
  claims: readonly Claim[],
  claimIds: readonly string[],
): Claim[] {
  const requested = new Set(claimIds);
  return claims.filter(
    (claim) =>
      requested.has(claim.claimId) &&
      (claim.status === "error" || claim.status === "awaiting_research"),
  );
}

/** A failed explanation already has a completed evidence checkpoint. */
export function retainedResearch(detail: ClaimDetail | null): ResearchResult | undefined {
  return detail?.research ? { ...detail.research, evidence: detail.evidence } : undefined;
}

export async function copyExtractionCheckpoint(
  bucket: Pick<R2Bucket, "head" | "get" | "put">,
  runId: string,
  attemptId: string,
  previousAttemptId: string | undefined,
  chunkIndex: number,
): Promise<boolean> {
  const target = `runs/${runId}/extraction/${attemptId}/${chunkIndex}.json`;
  if (await bucket.head(target)) return true;
  if (!previousAttemptId || previousAttemptId === attemptId) return false;
  const source = await bucket.get(
    `runs/${runId}/extraction/${previousAttemptId}/${chunkIndex}.json`,
  );
  if (!source) return false;
  await bucket.put(target, await source.text(), {
    httpMetadata: { contentType: "application/json" },
  });
  return true;
}
