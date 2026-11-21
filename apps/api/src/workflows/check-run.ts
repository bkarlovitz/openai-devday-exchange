import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { Effect, Schema } from "effect";
import { Submission } from "@council/contracts";
import type { Env } from "../env";
import { coordinator } from "../services/run-store";
import { chunkText } from "../services/chunk-text";
import { extractClaims } from "../services/extract-claims";

export class CheckRun extends WorkflowEntrypoint<Env, { runId: string }> {
  async run(event: WorkflowEvent<{ runId: string }>, step: WorkflowStep) {
    const runId = event.payload.runId;
    const attemptId = event.instanceId;
    const owner = coordinator(this.env, runId);
    try {
      const object = await this.env.SUBMISSIONS.get(`runs/${runId}/submission.json`);
      if (!object) throw new Error("Saved submission is missing.");
      const submission = Schema.decodeUnknownSync(Submission)(await object.json());
      const chunks = chunkText(submission.text);
      await step.do("begin-extraction", () => owner.beginExtraction(attemptId, chunks.length));
      for (const chunk of chunks) {
        const key = `runs/${runId}/extraction/${attemptId}/${chunk.index}.json`;
        await step.do(
          `extract-${chunk.index}`,
          { retries: { limit: 0, delay: "1 second" }, timeout: "40 seconds" },
          async () => {
            if (await this.env.SUBMISSIONS.head(key)) return key;
            const result = await Effect.runPromise(
              extractClaims(this.env, chunk, submission, runId),
            );
            await this.env.SUBMISSIONS.put(key, JSON.stringify(result), {
              httpMetadata: { contentType: "application/json" },
            });
            return key;
          },
        );
        await step.do(`publish-${chunk.index}`, async () => {
          const artifact = await this.env.SUBMISSIONS.get(key);
          if (!artifact) throw new Error("Extraction artifact is missing.");
          const result = await artifact.json<{
            language: "en" | "es" | "ca";
            claims: import("@council/contracts").Claim[];
          }>();
          await owner.publishChunk(attemptId, chunk.index, result.language, result.claims);
        });
      }
      await step.do("finish-extraction", () => owner.finishExtraction(attemptId));
      return { runId, status: "extracted" };
    } catch (error) {
      await owner.failExtraction(
        attemptId,
        error instanceof Error ? error.message : "Extraction failed.",
      );
      throw error;
    }
  }
}
