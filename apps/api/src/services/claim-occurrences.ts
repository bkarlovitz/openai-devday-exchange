import type { Claim } from "@council/contracts";

// Deliberately exact: differing wording, scope, dates or quantities stay separate.
export function claimSignature(claim: Claim): string {
  const normalized = (text: string) => text.trim().replace(/[.!?]+$/, "");
  const comparison =
    claim.comparison && normalized(claim.comparison) !== normalized(claim.assertion)
      ? claim.comparison
      : null;
  return JSON.stringify([
    claim.quote,
    claim.assertion,
    claim.entities,
    claim.dates,
    claim.metric,
    claim.place,
    comparison,
    !claim.entities.length && !claim.place ? claim.context : null,
  ]);
}

export function mergeOccurrences(existing: Claim, incoming: Claim): Claim {
  const occurrences = [
    ...(existing.occurrences ?? [existing]),
    ...(incoming.occurrences ?? [incoming]),
  ].map(({ start, end, speaker, startSeconds }) => ({ start, end, speaker, startSeconds }));
  return {
    ...existing,
    occurrences: [
      ...new Map(occurrences.map((item) => [`${item.start}:${item.end}`, item])).values(),
    ].sort((a, b) => a.start - b.start),
  };
}
