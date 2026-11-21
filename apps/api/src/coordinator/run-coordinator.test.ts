import { describe, expect, it, vi } from "vitest";
import type { Claim, ClaimDetail, Run } from "@council/contracts";
import type { Env } from "../env";

vi.mock("cloudflare:workers", () => ({
  DurableObject: class {
    constructor(
      protected ctx: DurableObjectState,
      protected env: Env,
    ) {}
  },
}));

import { RunCoordinator } from "./run-coordinator";

const runId = "a3ae6976-dc3f-4d19-82c4-f624d8cf9654";
const originalAttempt = `${runId}-extract-1`;
const original: Omit<Run, "claims"> = {
  runId,
  submission: { submissionKey: runId, text: "The service opened." },
  status: "complete",
  createdAt: "2026-11-21T13:00:00Z",
  revision: 1,
  errorCount: 0,
  detectedLanguage: "en",
  explanationLanguage: "en",
  extraction: { attemptId: originalAttempt, completedChunks: 1, totalChunks: 1, done: true },
};
const claim: Claim = {
  claimId: `${runId}-0-0`,
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
  status: "complete",
  explanationLanguage: "en",
};

function fixture(run = original, claims = [claim]) {
  const data = new Map<string, unknown>([["run", structuredClone(run)]]);
  for (const item of claims) data.set(`claim/${item.claimId}`, structuredClone(item));
  const artifacts = new Map<string, unknown>();
  const storage = {
    get: async (key: string) => structuredClone(data.get(key)),
    put: async (key: string | Record<string, unknown>, value?: unknown) => {
      if (typeof key === "string") data.set(key, structuredClone(value));
      else
        for (const [entry, content] of Object.entries(key))
          data.set(entry, structuredClone(content));
    },
    list: async ({ prefix }: { prefix: string }) =>
      new Map(
        [...data]
          .filter(([key]) => key.startsWith(prefix))
          .map(([key, value]) => [key, structuredClone(value)]),
      ),
    setAlarm: vi.fn(async () => {}),
  };
  const ctx = { storage, blockConcurrencyWhile: async <T>(fn: () => Promise<T>) => fn() };
  const checkCreate = vi.fn(async (_input: unknown) => ({}));
  const translateCreate = vi.fn(async (_input: unknown) => ({}));
  const checkGet = vi.fn(async (_id: string) => ({ status: async () => ({ status: "unknown" }) }));
  const env = {
    CHECK_RUN: { create: checkCreate, get: checkGet },
    TRANSLATE_CLAIM: { create: translateCreate },
    SUBMISSIONS: {
      get: async (key: string) =>
        artifacts.has(key) ? { json: async () => structuredClone(artifacts.get(key)) } : null,
    },
  };
  const owner = new RunCoordinator(ctx as unknown as DurableObjectState, env as unknown as Env);
  return { owner, data, artifacts, checkCreate, checkGet, translateCreate, storage };
}

describe("coordinator recovery and language ownership", () => {
  it("replays a retry receipt without creating another job and rejects command reuse", async () => {
    const state = fixture(original, [{ ...claim, status: "error", error: "Provider failed" }]);
    const first = await state.owner.requestRetry("command-1", claim.claimId);
    const repeated = await state.owner.requestRetry("command-1", claim.claimId);
    expect(repeated).toEqual(first);
    expect(first.status).toBe(202);
    expect(state.checkCreate).toHaveBeenCalledOnce();
    expect((await state.owner.requestLanguage("command-1", "es")).status).toBe(409);
    expect(state.translateCreate).not.toHaveBeenCalled();
  });
  it("separates extraction and failed-claim jobs without revoking an active sibling", async () => {
    const active = { ...claim, claimId: `${runId}-0-1`, status: "researching" as const };
    const run = {
      ...original,
      status: "processing" as const,
      error: "Later chunk failed",
      extraction: { ...original.extraction!, done: false, totalChunks: 2 },
    };
    const state = fixture(run, [{ ...claim, status: "error" }, active]);
    state.data.set(`research-attempt/${active.claimId}`, originalAttempt);
    await state.owner.requestRetry("recovery");
    expect(state.checkCreate).toHaveBeenCalledTimes(2);
    const jobs = state.checkCreate.mock.calls.map(
      ([input]) =>
        input as {
          id: string;
          params: {
            claimIds?: string[];
            resumeResearch?: boolean;
            reuseExtractionAttemptId?: string;
          };
        },
    );
    expect(jobs.find((job) => job.params.resumeResearch)?.params.claimIds).toEqual([claim.claimId]);
    expect(jobs.find((job) => !job.params.resumeResearch)?.params.reuseExtractionAttemptId).toBe(
      originalAttempt,
    );
    expect(await state.owner.beginResearch(originalAttempt, active.claimId)).toBe(true);
    state.artifacts.set("active-result", {
      claim: { ...active, status: "complete" },
      evidence: [],
      assessment: {
        verdict: "insufficient_evidence",
        explanation: "Needs more evidence.",
        evidenceIds: [],
        uncertainty: [],
        calculations: [],
      },
    });
    await state.owner.publishClaim(originalAttempt, active.claimId, "active-result");
    const runAfter = await state.owner.getRun();
    expect(runAfter?.claims.find((item) => item.claimId === active.claimId)?.status).toBe(
      "complete",
    );
    expect(runAfter?.claims.find((item) => item.claimId === claim.claimId)?.status).toBe(
      "awaiting_research",
    );
    expect(runAfter?.status).toBe("processing");
  });

  it("scopes fatal recovery cleanup and completion to the selected failed claim", async () => {
    const active = { ...claim, claimId: `${runId}-0-1`, status: "researching" as const };
    const state = fixture(original, [{ ...claim, status: "error" }, active]);
    state.data.set(`research-attempt/${active.claimId}`, originalAttempt);
    await state.owner.requestRetry("recovery", claim.claimId);
    const retryAttempt = `${runId}-retry-recovery`;
    await state.owner.finishResearch(retryAttempt, [claim.claimId]);
    expect((await state.owner.getRun())?.status).toBe("processing");
    await state.owner.finishFailedRun(retryAttempt, "Retry provider failed", [claim.claimId]);
    const after = await state.owner.getRun();
    expect(after?.claims.find((item) => item.claimId === active.claimId)?.status).toBe(
      "researching",
    );
    expect(after?.claims.find((item) => item.claimId === claim.claimId)?.status).toBe("error");
    expect(after?.status).toBe("processing");
    expect(after?.error).toBeUndefined();
  });

  it("rejects stale per-claim assessment publications after retry authorization", async () => {
    const state = fixture(original, [{ ...claim, status: "error" }]);
    state.data.set(`research-attempt/${claim.claimId}`, originalAttempt);
    await state.owner.requestRetry("recovery", claim.claimId);
    state.artifacts.set("stale", { claim, evidence: [] });
    await expect(state.owner.publishClaim(originalAttempt, claim.claimId, "stale")).rejects.toThrow(
      "Stale claim publication",
    );
  });

  it("ignores stale language generations, preserves the assessment and reuses matching cache", async () => {
    const state = fixture();
    const sourceKey = "source-detail";
    const detail: ClaimDetail = {
      claim,
      evidence: [],
      assessment: {
        verdict: "insufficient_evidence",
        explanation: "Original English",
        evidenceIds: [],
        uncertainty: ["Unknown"],
        calculations: [],
      },
    };
    state.data.set(`detail/${claim.claimId}`, sourceKey);
    state.data.set(`source-language/${claim.claimId}`, "en");
    state.artifacts.set(sourceKey, detail);
    state.artifacts.set("es", { explanation: "Español", uncertainty: [] });
    state.artifacts.set("ca", { explanation: "Català", uncertainty: ["Desconegut"] });
    await state.owner.requestLanguage("choose-es", "es");
    await state.owner.requestLanguage("choose-ca", "ca");
    expect(await state.owner.beginTranslation(1, claim.claimId, "es", sourceKey)).toBe(false);
    await state.owner.publishTranslation(1, claim.claimId, "es", sourceKey, "es");
    expect(state.data.has(`translated/${claim.claimId}/es`)).toBe(false);
    expect(await state.owner.beginTranslation(2, claim.claimId, "ca", sourceKey)).toBe(true);
    await state.owner.publishTranslation(2, claim.claimId, "ca", sourceKey, "ca");
    const translated = JSON.parse((await state.owner.getClaimJson(claim.claimId))!);
    expect(translated.assessment.explanation).toBe("Català");
    expect(translated.assessment.verdict).toBe(detail.assessment?.verdict);
    expect(translated.claim.explanationLanguage).toBe("ca");
    expect((await state.owner.getRun())?.translation?.status).toBe("complete");
    const jobs = state.translateCreate.mock.calls.length;
    await state.owner.requestLanguage("choose-en", "en");
    expect(
      JSON.parse((await state.owner.getClaimJson(claim.claimId))!).assessment.explanation,
    ).toBe("Original English");
    await state.owner.requestLanguage("choose-ca-again", "ca");
    expect(state.translateCreate).toHaveBeenCalledTimes(jobs);
    expect(
      JSON.parse((await state.owner.getClaimJson(claim.claimId))!).assessment.explanation,
    ).toBe("Català");
  });

  it("does not attach a translation to a replacement source artifact", async () => {
    const state = fixture();
    state.data.set(`detail/${claim.claimId}`, "source-old");
    state.data.set(`source-language/${claim.claimId}`, "en");
    await state.owner.requestLanguage("choose-es", "es");
    state.data.set(`detail/${claim.claimId}`, "source-new");
    state.artifacts.set("translation", { explanation: "Old source translation", uncertainty: [] });
    await state.owner.publishTranslation(1, claim.claimId, "es", "source-old", "translation");
    expect(state.data.has(`translated/${claim.claimId}/es`)).toBe(false);
    expect(await state.owner.beginTranslation(1, claim.claimId, "es", "source-old")).toBe(false);
  });
  it("accepts an existing errored workflow after its create response was lost", async () => {
    const state = fixture(original, [{ ...claim, status: "error" }]);
    state.checkCreate.mockRejectedValueOnce(new Error("Create response was lost"));
    state.checkGet.mockResolvedValueOnce({ status: async () => ({ status: "errored" }) });
    const receipt = await state.owner.requestRetry("lost-response", claim.claimId);
    expect(receipt.status).toBe(202);
    expect(await state.owner.requestRetry("lost-response", claim.claimId)).toEqual(receipt);
    expect(state.checkCreate).toHaveBeenCalledOnce();
    expect(state.data.get(`started/${runId}-retry-lost-response`)).toBe(true);
  });

  it("retains launch intent for alarm recovery without retiring an active sibling", async () => {
    const active = { ...claim, claimId: `${runId}-0-1`, status: "researching" as const };
    const state = fixture(original, [{ ...claim, status: "error" }, active]);
    state.data.set(`research-attempt/${active.claimId}`, originalAttempt);
    state.checkCreate.mockRejectedValueOnce(new Error("Create unavailable"));
    await expect(state.owner.requestRetry("delayed-launch", claim.claimId)).rejects.toThrow(
      "Create unavailable",
    );
    const workflowId = `${runId}-retry-delayed-launch`;
    expect(state.data.has(`job/${workflowId}`)).toBe(true);
    expect(state.data.has(`started/${workflowId}`)).toBe(false);
    expect(state.storage.setAlarm).toHaveBeenCalled();
    const pending = await state.owner.getRun();
    expect(pending?.claims.find((item) => item.claimId === active.claimId)?.status).toBe(
      "researching",
    );
    await state.owner.alarm();
    expect(state.checkCreate).toHaveBeenCalledTimes(2);
    expect(state.data.get(`started/${workflowId}`)).toBe(true);
    expect((await state.owner.requestRetry("delayed-launch", claim.claimId)).status).toBe(202);
    expect(state.checkCreate).toHaveBeenCalledTimes(2);
  });
  it("translates legacy explanations despite an inferred matching run language", async () => {
    const legacyClaim: Claim = { ...claim, explanationLanguage: undefined };
    const state = fixture({ ...original, detectedLanguage: "ca", explanationLanguage: "ca" }, [
      { ...legacyClaim, explanationLanguage: "ca" },
    ]);
    const sourceKey = "legacy-english-source";
    const detail: ClaimDetail = {
      claim: legacyClaim,
      evidence: [],
      assessment: {
        verdict: "insufficient_evidence",
        explanation: "The original explanation is English despite the Catalan run metadata.",
        evidenceIds: [],
        uncertainty: ["No matching source."],
        calculations: [],
      },
    };
    state.data.set(`detail/${claim.claimId}`, sourceKey);
    state.data.set(`source-language/${claim.claimId}`, "ca");
    state.artifacts.set(sourceKey, detail);
    state.artifacts.set("legacy-catalan-translation", {
      explanation: "L’evidència disponible és insuficient per comprovar l’afirmació.",
      uncertainty: ["No s’ha trobat cap font coincident."],
    });
    expect((await state.owner.requestLanguage("legacy-ca", "ca")).status).toBe(202);
    expect(state.translateCreate).toHaveBeenCalledOnce();
    expect(state.data.get(`source-language-verified/${claim.claimId}`)).toBe(false);
    const pending = await state.owner.getRun();
    expect(pending?.claims[0].translationStatus).toBe("queued");
    expect(pending?.claims[0].explanationLanguage).toBeUndefined();
    expect(await state.owner.beginTranslation(1, claim.claimId, "ca", sourceKey)).toBe(true);
    await state.owner.publishTranslation(
      1,
      claim.claimId,
      "ca",
      sourceKey,
      "legacy-catalan-translation",
    );
    const result = JSON.parse((await state.owner.getClaimJson(claim.claimId))!);
    expect(result.assessment.explanation).toBe(
      "L’evidència disponible és insuficient per comprovar l’afirmació.",
    );
    expect(result.assessment.verdict).toBe(detail.assessment?.verdict);
    expect(result.assessment.calculations).toEqual(detail.assessment?.calculations);
    expect(result.evidence).toEqual(detail.evidence);
    expect(result.claim.explanationLanguage).toBe("ca");
    expect((await state.owner.requestLanguage("legacy-ca-again", "ca")).status).toBe(202);
    expect(state.translateCreate).toHaveBeenCalledOnce();
    expect((await state.owner.getRun())?.claims[0].translationStatus).toBeUndefined();
    expect(await state.owner.beginTranslation(2, claim.claimId, "ca", sourceKey)).toBe(false);
  });
});
