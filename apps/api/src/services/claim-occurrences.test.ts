import { describe, expect, it } from "vitest";
import type { Claim } from "@council/contracts";
import { claimSignature, mergeOccurrences } from "./claim-occurrences";

const claim: Claim = {
  claimId: "claim-1",
  quote: "Rent rose 5% in 2025.",
  assertion: "Barcelona rent rose 5% in 2025.",
  start: 0,
  end: 20,
  context: "Housing debate",
  entities: ["Barcelona"],
  dates: ["2025"],
  metric: "rent",
  place: "Barcelona",
  comparison: "5% increase",
  status: "awaiting_research",
};

describe("claim occurrence identity", () => {
  it("keeps unscoped statements in different record contexts separate", () => {
    const unscoped = { ...claim, entities: [], place: null };
    expect(claimSignature({ ...unscoped, context: "Invoice A" })).not.toBe(
      claimSignature({ ...unscoped, context: "Invoice B" }),
    );
  });
  it("ignores a comparison field that merely repeats the unchanged assertion", () => {
    expect(claimSignature({ ...claim, comparison: claim.assertion.slice(0, -1) })).toBe(
      claimSignature({ ...claim, comparison: null }),
    );
  });
  it("recognizes an exact repeated assertion at a different position", () => {
    expect(claimSignature({ ...claim, claimId: "later", start: 100, end: 120 })).toBe(
      claimSignature(claim),
    );
  });

  it.each([
    { quote: "Rent rose 6% in 2025." },
    { assertion: "Barcelona rent rose 6% in 2025." },
    { dates: ["2026"] },
    { place: "Catalonia" },
    { comparison: "6% increase" },
    { metric: "rent index" },
    { entities: ["Madrid"] },
  ])("keeps a changed assertion or scope separate (%j)", (change) => {
    expect(claimSignature({ ...claim, ...change })).not.toBe(claimSignature(claim));
  });

  it("retains completed results and the canonical ID when appending an occurrence", () => {
    const completed: Claim = {
      ...claim,
      status: "complete",
      verdict: "supported",
      evidenceCount: 2,
    };
    const repeated: Claim = {
      ...claim,
      claimId: "claim-2",
      start: 100,
      end: 120,
      speaker: "Councillor",
      startSeconds: 45,
    };
    const result = mergeOccurrences(completed, repeated);
    expect(result.claimId).toBe(completed.claimId);
    expect(result.status).toBe("complete");
    expect(result.verdict).toBe("supported");
    expect(result.evidenceCount).toBe(2);
    expect(result.occurrences).toEqual([
      { start: 0, end: 20, speaker: undefined, startSeconds: undefined },
      { start: 100, end: 120, speaker: "Councillor", startSeconds: 45 },
    ]);
    expect(completed.occurrences).toBeUndefined();
  });

  it("deduplicates overlapping chunk occurrences and keeps distinct positions sorted", () => {
    const repeated = mergeOccurrences(claim, { ...claim, start: 100, end: 120 });
    const overlapped = mergeOccurrences(repeated, { ...claim, claimId: "overlap" });
    const earlier = mergeOccurrences(overlapped, { ...claim, start: 50, end: 70 });
    expect(earlier.occurrences?.map(({ start, end }) => [start, end])).toEqual([
      [0, 20],
      [50, 70],
      [100, 120],
    ]);
    expect(mergeOccurrences(earlier, earlier).occurrences).toEqual(earlier.occurrences);
  });
});
