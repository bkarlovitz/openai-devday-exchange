import { DurableObject } from "cloudflare:workers";
import type { Claim, Run, Submission } from "@council/contracts";
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
      await this.env.CHECK_RUN.create({ id: attemptId, params: { runId: run.runId } });
    } catch (error) {
      const existing = await this.env.CHECK_RUN.get(attemptId);
      const status = await existing.status();
      if (status.status === "unknown" || status.status === "errored") throw error;
    }
  }
}
