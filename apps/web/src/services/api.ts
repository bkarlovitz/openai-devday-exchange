import { Effect, Schema } from "effect";
import { ApiError, Run, SubmissionReceipt } from "@council/contracts";
import type { Submission } from "@council/contracts";

async function responseBody(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = Schema.decodeUnknownOption(ApiError)(body);
    throw new Error(error._tag === "Some" ? error.value.error : "The request failed.");
  }
  return body;
}

export function saveSubmission(submission: Submission) {
  return Effect.tryPromise({
    try: async () => {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
      return Schema.decodeUnknownSync(SubmissionReceipt)(await responseBody(response));
    },
    catch: (cause) => (cause instanceof Error ? cause : new Error("Could not save your text.")),
  });
}

export function loadRun(runId: string, signal: AbortSignal) {
  return Effect.tryPromise({
    try: async () => {
      const response = await fetch(`/api/runs/${runId}`, { signal });
      return Schema.decodeUnknownSync(Run)(await responseBody(response));
    },
    catch: (cause) =>
      cause instanceof Error ? cause : new Error("Could not load this submission."),
  });
}
