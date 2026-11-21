import { DurableObject } from "cloudflare:workers";
import { ClaimDetail } from "@council/contracts";
import type { Claim, Run, Submission } from "@council/contracts";
import { Schema } from "effect";
import type { Env } from "../env";

type StoredRun = Omit<Run, "claims">;
type SubmitResult = { conflict: true } | { conflict: false; run: Run };

export class RunCoordinator extends DurableObject<Env> {
  async submit(submission: Submission): Promise<SubmitResult> {
    return this.ctx.blockConcurrencyWhile(async () => {
      let run = await this.ctx.storage.get<StoredRun>("run");
      if (run && JSON.stringify(run.submission) !== JSON.stringify(submission))
        return { conflict: true };
      if (!run) {
        run = {
          runId: submission.submissionKey,
          submission,
          status: "queued",
          createdAt: new Date().toISOString(),
          revision: 0,
          errorCount: 0,
        };
      }
      if (!run.extraction) {
        run = {
          ...run,
          status: "queued",
          extraction: {
            attemptId: `${run.runId}-extract-1`,
            completedChunks: 0,
            totalChunks: 0,
            done: false,
          },
        };
      }
      const pipelineVersion = await this.ctx.storage.get<number>("pipeline-version");
      if (!pipelineVersion && run.extraction?.done && run.status === "processing") {
        run = {
          ...run,
          status: "queued",
          extraction: {
            ...run.extraction,
            attemptId: `${run.runId}-check-1`,
          },
        };
      }
      await this.ctx.storage.put("pipeline-version", 2);
      await this.ctx.storage.put("run", run);
      if (run.status === "queued") {
        await this.ctx.storage.setAlarm(Date.now() + 10_000);
        await this.launch(run);
      }
      return { conflict: false, run: { ...run, claims: [] } };
    });
  }

  async getRun(): Promise<Run | null> {
    const run = await this.ctx.storage.get<StoredRun>("run");
    if (!run) return null;
    const claims = await this.ctx.storage.list<Claim>({ prefix: "claim/" });
    return {
      ...run,
      claims: [...claims.values()].sort(
        (a, b) => a.start - b.start || a.claimId.localeCompare(b.claimId),
      ),
    };
  }

  async beginExtraction(attemptId: string, totalChunks: number): Promise<void> {
    await this.updateAttempt(attemptId, (run) => ({
      ...run,
      status: "extracting",
      extraction: { ...run.extraction!, totalChunks },
    }));
    await this.ctx.storage.deleteAlarm();
  }

  async publishChunk(
    attemptId: string,
    index: number,
    language: "en" | "es" | "ca",
    claims: Claim[],
  ): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      if (!run || run.extraction?.attemptId !== attemptId)
        throw new Error("Stale extraction attempt.");
      const published = `published/${attemptId}/${index}`;
      if (await this.ctx.storage.get(published)) return;
      for (const claim of claims) await this.ctx.storage.put(`claim/${claim.claimId}`, claim);
      await this.ctx.storage.put(published, true);
      await this.ctx.storage.put("run", {
        ...run,
        detectedLanguage: run.detectedLanguage ?? language,
        explanationLanguage: run.submission.explanationLanguage ?? run.detectedLanguage ?? language,
        extraction: {
          ...run.extraction,
          completedChunks: Math.max(run.extraction.completedChunks, index + 1),
        },
        revision: run.revision + 1,
      });
    });
  }

  async finishExtraction(attemptId: string): Promise<void> {
    const claims = await this.ctx.storage.list<Claim>({ prefix: "claim/" });
    await this.updateAttempt(attemptId, (run) => ({
      ...run,
      status: claims.size ? "processing" : "complete",
      extraction: { ...run.extraction!, done: true },
    }));
  }

  async failExtraction(attemptId: string, error: string): Promise<void> {
    await this.updateAttempt(attemptId, (run) => ({ ...run, status: "error", error }));
  }

  async getClaimJson(claimId: string): Promise<string | null> {
    const claim = await this.ctx.storage.get<Claim>(`claim/${claimId}`);
    if (!claim) return null;
    const reference = await this.ctx.storage.get<string>(`detail/${claimId}`);
    if (!reference) return JSON.stringify({ claim, evidence: [] });
    const artifact = await this.env.SUBMISSIONS.get(reference);
    if (!artifact) throw new Error("Claim detail artifact is missing.");
    const detail = Schema.decodeUnknownSync(ClaimDetail)(await artifact.json());
    return JSON.stringify({ ...detail, claim });
  }

  async beginResearch(attemptId: string, claimId: string): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      const claim = await this.ctx.storage.get<Claim>(`claim/${claimId}`);
      if (!run || run.extraction?.attemptId !== attemptId || !claim)
        throw new Error("Stale research attempt.");
      if (["complete", "error", "not_checkable"].includes(claim.status)) return;
      await this.ctx.storage.put({
        [`claim/${claimId}`]: { ...claim, status: "researching" },
        [`research-attempt/${claimId}`]: attemptId,
        run: { ...run, status: "processing", revision: run.revision + 1 },
      });
    });
  }

  async publishClaim(attemptId: string, claimId: string, artifactKey: string): Promise<void> {
    const artifact = await this.env.SUBMISSIONS.get(artifactKey);
    if (!artifact) throw new Error("Research artifact is missing.");
    const detail = Schema.decodeUnknownSync(ClaimDetail)(await artifact.json());
    if (detail.claim.claimId !== claimId) throw new Error("Mismatched claim artifact.");
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      const current = await this.ctx.storage.get<string>(`research-attempt/${claimId}`);
      if (!run || current !== attemptId || run.extraction?.attemptId !== attemptId) {
        throw new Error("Stale claim publication.");
      }
      const claim: Claim = {
        ...detail.claim,
        evidenceCount: detail.evidence.length,
        verdict: detail.assessment?.verdict,
      };
      await this.ctx.storage.put({
        [`claim/${claimId}`]: claim,
        [`detail/${claimId}`]: artifactKey,
        run: { ...run, revision: run.revision + 1 },
      });
    });
  }

  async finishResearch(attemptId: string): Promise<void> {
    const claims = await this.ctx.storage.list<Claim>({ prefix: "claim/" });
    const errorCount = [...claims.values()].filter((claim) => claim.status === "error").length;
    await this.updateAttempt(attemptId, (run) => ({ ...run, status: "complete", errorCount }));
  }

  async alarm(): Promise<void> {
    const run = await this.ctx.storage.get<StoredRun>("run");
    if (run?.status === "queued") await this.launch(run);
  }

  private async updateAttempt(
    attemptId: string,
    change: (run: StoredRun) => StoredRun,
  ): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      if (!run || run.extraction?.attemptId !== attemptId)
        throw new Error("Stale extraction attempt.");
      await this.ctx.storage.put("run", { ...change(run), revision: run.revision + 1 });
    });
  }

  private async launch(run: StoredRun): Promise<void> {
    await this.env.SUBMISSIONS.put(
      `runs/${run.runId}/submission.json`,
      JSON.stringify(run.submission),
      {
        httpMetadata: { contentType: "application/json" },
      },
    );
    const attemptId = run.extraction!.attemptId;
    try {
      await this.env.CHECK_RUN.create({
        id: attemptId,
        params: { runId: run.runId, resumeResearch: run.extraction?.done === true },
      });
    } catch (error) {
      const existing = await this.env.CHECK_RUN.get(attemptId);
      const status = await existing.status();
      if (status.status === "unknown" || status.status === "errored") throw error;
    }
  }
}
