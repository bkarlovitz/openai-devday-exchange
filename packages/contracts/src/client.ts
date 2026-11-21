import { Effect, Schema } from "effect";
import { ApiError, Run, SubmissionReceipt } from "./runs";
import type { Submission } from "./runs";

export function createApiClient(baseUrl = "") {
  async function request(path: string, init?: RequestInit): Promise<unknown> {
    const response = await fetch(baseUrl + path, init);
    const body: unknown = await response.json();
    if (!response.ok) {
      const error = Schema.decodeUnknownOption(ApiError)(body);
      throw new Error(error._tag === "Some" ? error.value.error : "The request failed.");
    }
    return body;
  }
  return {
    saveSubmission(submission: Submission) {
      return Effect.tryPromise({
        try: async () =>
          Schema.decodeUnknownSync(SubmissionReceipt)(
            await request("/api/runs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(submission),
            }),
          ),
        catch: (cause) => (cause instanceof Error ? cause : new Error("Could not save your text.")),
      });
    },
    loadRun(runId: string, signal: AbortSignal) {
      return Effect.tryPromise({
        try: async () =>
          Schema.decodeUnknownSync(Run)(await request(`/api/runs/${runId}`, { signal })),
        catch: (cause) =>
          cause instanceof Error ? cause : new Error("Could not load this submission."),
      });
    },
  };
}
