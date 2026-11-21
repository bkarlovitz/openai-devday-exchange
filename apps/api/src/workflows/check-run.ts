import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import type { Env } from "../env";
import { coordinator } from "../services/run-store";

export class CheckRun extends WorkflowEntrypoint<Env, { runId: string }> {
  async run(event: WorkflowEvent<{ runId: string }>, step: WorkflowStep) {
    await step.do("record-saved-submission", async () => {
      const object = await this.env.SUBMISSIONS.head(`runs/${event.payload.runId}/submission.json`);
      if (!object) {
        throw new Error("Saved submission is missing.");
      }
      await coordinator(this.env, event.payload.runId).markAwaitingProcessing();
    });
    return { runId: event.payload.runId, status: "awaiting_processing" };
  }
}
