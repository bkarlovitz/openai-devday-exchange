import { describe, expect, it } from "vitest";
import type { Claim, Run } from "@council/contracts";
import { claimIsTerminal, deriveProgress } from "./run-progress";

const run: Omit<Run, "claims"> = {
  runId: "a3ae6976-dc3f-4d19-82c4-f624d8cf9654",
  submission: {
    submissionKey: "a3ae6976-dc3f-4d19-82c4-f624d8cf9654",
    text: "A factual statement.",
  },
  status: "extracting",
  createdAt: "2026-11-21T13:00:00Z",
  revision: 1,
  errorCount: 0,
  extraction: {
    attemptId: "extract-1",
    completedChunks: 1,
    totalChunks: 2,
    done: false,
  },
};
const claim: Claim = {
  claimId: "claim-1",
  quote: "A factual statement.",
  assertion: "A factual statement.",
  start: 0,
  end: 20,
  context: "",
  entities: [],
  dates: [],
  metric: null,
  place: null,
  comparison: null,
  status: "researching",
};

const extracted = { ...run, extraction: { ...run.extraction!, done: true } };

describe("run progress during overlapping extraction and research", () => {
  it.each(["awaiting_research", "researching", "assessing"] as const)(
    "keeps %s pending after extraction finishes",
    (status) => {
      expect(claimIsTerminal({ ...claim, status })).toBe(false);
      expect(deriveProgress(extracted, [{ ...claim, status }]).status).toBe("processing");
    },
  );

  it("does not complete when all currently extracted claims finish before extraction", () => {
    const result = deriveProgress(run, [{ ...claim, status: "complete" }]);
    expect(result.status).toBe("processing");
    expect(result.extraction?.done).toBe(false);
  });

  it("does not complete an empty queue while extraction is active", () => {
    expect(deriveProgress(run, []).status).toBe("extracting");
    expect(deriveProgress(extracted, []).status).toBe("complete");
  });

  it("finishes when extraction succeeded and every claim is terminal", () => {
    const claims: Claim[] = [
      { ...claim, status: "complete" },
      { ...claim, claimId: "failed", status: "error" },
      { ...claim, claimId: "opinion", status: "not_checkable" },
    ];
    expect(claims.every(claimIsTerminal)).toBe(true);
    expect(deriveProgress(extracted, claims)).toMatchObject({ status: "complete", errorCount: 1 });
  });

  it("preserves an extraction error while earlier claims drain, then terminates with error", () => {
    const failedExtraction = { ...run, error: "Chunk 2 failed" };
    const draining = deriveProgress(failedExtraction, [claim]);
    expect(draining).toMatchObject({ status: "processing", error: "Chunk 2 failed" });
    const finished = deriveProgress(draining, [{ ...claim, status: "complete" }]);
    expect(finished).toMatchObject({ status: "error", error: "Chunk 2 failed", errorCount: 0 });
    expect(finished.extraction?.done).toBe(false);
    expect(failedExtraction.status).toBe("extracting");
  });

  it("retains both extraction failure and partial claim error counts", () => {
    const failedExtraction = { ...run, error: "Extraction unavailable" };
    expect(
      deriveProgress(failedExtraction, [
        { ...claim, status: "error" },
        { ...claim, claimId: "ok", status: "complete" },
      ]),
    ).toMatchObject({ status: "error", errorCount: 1, error: "Extraction unavailable" });
    expect(deriveProgress(failedExtraction, []).status).toBe("error");
  });
});
