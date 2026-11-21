import { Effect, Schema } from "effect";
import { ApiError, Run, SubmissionReceipt } from "./runs";
import type { YoutubeSubmission } from "./youtube";
import type { Submission } from "./runs";
import { ClaimDetail } from "./claims";
import { MutationReceipt } from "./mutations";
import type { RetryCommand, LanguageCommand } from "./mutations";

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
    retryRun(runId: string, command: RetryCommand) {
      return Effect.tryPromise({
        try: async () =>
          Schema.decodeUnknownSync(MutationReceipt)(
            await request(`/api/runs/${runId}/retry`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(command),
            }),
          ),
        catch: (cause) =>
          cause instanceof Error ? cause : new Error("Could not retry this check."),
      });
    },
    changeLanguage(runId: string, command: LanguageCommand) {
      return Effect.tryPromise({
        try: async () =>
          Schema.decodeUnknownSync(MutationReceipt)(
            await request(`/api/runs/${runId}/language`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(command),
            }),
          ),
        catch: (cause) =>
          cause instanceof Error ? cause : new Error("Could not change explanation language."),
      });
    },
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
    saveYoutubeSubmission(submission: YoutubeSubmission) {
      return Effect.tryPromise({
        try: async () =>
          Schema.decodeUnknownSync(SubmissionReceipt)(
            await request("/api/runs/youtube", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(submission),
              signal: AbortSignal.timeout(55_000),
            }),
          ),
        catch: (cause) => (cause instanceof Error ? cause : new Error("YouTube import failed.")),
      });
    },
    loadClaim(runId: string, claimId: string, signal: AbortSignal) {
      return Effect.tryPromise({
        try: async () =>
          Schema.decodeUnknownSync(ClaimDetail)(
            await request(`/api/runs/${runId}/claims/${claimId}`, { signal }),
          ),
        catch: (cause) =>
          cause instanceof Error ? cause : new Error("Could not load this claim."),
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
