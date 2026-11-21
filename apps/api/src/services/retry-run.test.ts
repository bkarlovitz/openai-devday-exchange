import { describe, expect, it, vi } from "vitest";
import type { Claim, ClaimDetail } from "@council/contracts";
import { copyExtractionCheckpoint, retainedResearch, selectRecoveryClaims } from "./retry-run";

const claim: Claim = {
  claimId: "failed",
  quote: "The service opened.",
  assertion: "The service opened.",
  start: 0,
  end: 19,
  context: "",
  entities: [],
  dates: [],
  metric: null,
  place: null,
  comparison: null,
  status: "error",
};

function bucketFixture(initial: Record<string, string>) {
  const content = new Map(Object.entries(initial));
  const head = vi.fn(async (key: string) => (content.has(key) ? { key } : null));
  const get = vi.fn(async (key: string) => {
    const text = content.get(key);
    return text === undefined ? null : { text: async () => text };
  });
  const put = vi.fn(async (key: string, body: string) => {
    content.set(key, body);
    return { key };
  });
  return {
    content,
    head,
    get,
    put,
    bucket: { head, get, put } as unknown as Pick<R2Bucket, "head" | "get" | "put">,
  };
}

describe("scoped recovery scheduling", () => {
  it("selects only authorized failed or reset queued claims", () => {
    const claims: Claim[] = [
      claim,
      { ...claim, claimId: "reset", status: "awaiting_research" },
      { ...claim, claimId: "unselected", status: "error" },
      { ...claim, claimId: "active", status: "researching" },
      { ...claim, claimId: "assessing", status: "assessing" },
      { ...claim, claimId: "done", status: "complete" },
      { ...claim, claimId: "opinion", status: "not_checkable" },
    ];
    const requested = [
      "failed",
      "reset",
      "active",
      "assessing",
      "done",
      "opinion",
      "unknown",
      "failed",
    ];
    expect(selectRecoveryClaims(claims, requested).map((item) => item.claimId)).toEqual([
      "failed",
      "reset",
    ]);
    expect(selectRecoveryClaims(claims, [])).toEqual([]);
    expect(claims[0].status).toBe("error");
  });

  it("retains completed research when only explanation failed", () => {
    const detail: ClaimDetail = {
      claim,
      evidence: [
        {
          evidenceId: "official",
          kind: "web",
          sourceUrl: "https://example.org/source",
          title: "Official record",
          retrievedAt: "2026-11-21T13:00:00Z",
          text: "The service opened.",
        },
      ],
      research: {
        checkable: true,
        topic: "municipal",
        evidence: [],
        decision: { relevant: true, sufficient: true, conflicting: false },
        notes: ["Research complete"],
      },
    };
    const result = retainedResearch(detail);
    expect(result).toMatchObject({ topic: "municipal", notes: ["Research complete"] });
    expect(result?.evidence).toEqual(detail.evidence);
    expect(result?.decision).toEqual(detail.research?.decision);
    expect(detail.research?.evidence).toEqual([]);
  });

  it("requires research when failure occurred before the evidence checkpoint", () => {
    expect(retainedResearch(null)).toBeUndefined();
    expect(retainedResearch({ claim, evidence: [] })).toBeUndefined();
  });
});

describe("extraction retry checkpoints", () => {
  it("copies successful previous chunks to the new attempt without changing the source", async () => {
    const source = "runs/run/extraction/old/0.json";
    const target = "runs/run/extraction/new/0.json";
    const artifact = JSON.stringify({ language: "en", claims: [claim] });
    const store = bucketFixture({ [source]: artifact });
    expect(await copyExtractionCheckpoint(store.bucket, "run", "new", "old", 0)).toBe(true);
    expect(store.content.get(target)).toBe(artifact);
    expect(store.content.get(source)).toBe(artifact);
    expect(store.put).toHaveBeenCalledOnce();
  });

  it("reuses the new attempt's own checkpoint on workflow replay", async () => {
    const target = "runs/run/extraction/new/0.json";
    const store = bucketFixture({ [target]: "already saved" });
    expect(await copyExtractionCheckpoint(store.bucket, "run", "new", "old", 0)).toBe(true);
    expect(store.get).not.toHaveBeenCalled();
    expect(store.put).not.toHaveBeenCalled();
  });

  it("returns false for a missing old chunk so normal extraction can run", async () => {
    const store = bucketFixture({ "runs/run/extraction/old/0.json": "prior chunk" });
    expect(await copyExtractionCheckpoint(store.bucket, "run", "new", "old", 1)).toBe(false);
    expect(store.put).not.toHaveBeenCalled();
  });

  it.each([undefined, "new"])(
    "does not read another artifact without a distinct previous attempt (%s)",
    async (previous) => {
      const store = bucketFixture({});
      expect(await copyExtractionCheckpoint(store.bucket, "run", "new", previous, 0)).toBe(false);
      expect(store.get).not.toHaveBeenCalled();
      expect(store.put).not.toHaveBeenCalled();
    },
  );
});
