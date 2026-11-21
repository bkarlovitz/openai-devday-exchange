import { DurableObject } from "cloudflare:workers";
import type { Run, Submission } from "@council/contracts";
import type { Env } from "../env";

type SubmitResult = { conflict: true } | { conflict: false; run: Run };

export class RunCoordinator extends DurableObject<Env> {
  async submit(submission: Submission): Promise<SubmitResult> {
    return this.ctx.blockConcurrencyWhile(async () => {
      let run = await this.ctx.storage.get<Run>("run");
      if (run && JSON.stringify(run.submission) !== JSON.stringify(submission)) {
        return { conflict: true };
      }
      if (!run) {
        run = {
          runId: submission.submissionKey,
          submission,
          status: "queued",
          createdAt: new Date().toISOString(),
          revision: 0,
        };
        // Save intent before remote writes so the same key recovers a partial request.
        await this.ctx.storage.put("run", run);
      }
      if (run.status === "queued") {
        await this.ctx.storage.setAlarm(Date.now() + 10_000);
        await this.launch(run);
      }
      return { conflict: false, run };
    });
  }

  async getRun(): Promise<Run | null> {
    return (await this.ctx.storage.get<Run>("run")) ?? null;
  }

  async markAwaitingProcessing(): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<Run>("run");
      if (run && run.status !== "awaiting_processing") {
        await this.ctx.storage.put("run", {
          ...run,
          status: "awaiting_processing",
          revision: run.revision + 1,
        });
      }
      await this.ctx.storage.deleteAlarm();
    });
  }

  async alarm(): Promise<void> {
    const run = await this.ctx.storage.get<Run>("run");
    if (run?.status === "queued") {
      await this.launch(run);
    }
  }

  private async launch(run: Run): Promise<void> {
    await this.env.SUBMISSIONS.put(
      `runs/${run.runId}/submission.json`,
      JSON.stringify(run.submission),
      { httpMetadata: { contentType: "application/json" } },
    );
    try {
      await this.env.CHECK_RUN.create({
        id: run.runId,
        params: { runId: run.runId },
      });
    } catch (error) {
      // A lost create response can leave an already-created instance behind.
      const existing = await this.env.CHECK_RUN.get(run.runId);
      const status = await existing.status();
      if (status.status === "unknown" || status.status === "errored") {
        throw error;
      }
    }
  }
}
