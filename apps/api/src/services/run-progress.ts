import type { Claim, Run } from "@council/contracts";

export function claimIsTerminal(claim: Claim): boolean {
  return ["complete", "error", "not_checkable"].includes(claim.status);
}

export function deriveProgress<T extends Omit<Run, "claims">>(run: T, claims: readonly Claim[]): T {
  const pending = claims.some((claim) => !claimIsTerminal(claim));
  const errorCount = claims.filter((claim) => claim.status === "error").length;
  if (!run.extraction) return run;
  const status: Run["status"] = run.error
    ? pending
      ? "processing"
      : "error"
    : !run.extraction.done
      ? claims.length
        ? "processing"
        : "extracting"
      : pending
        ? "processing"
        : "complete";
  return { ...run, status, errorCount };
}
