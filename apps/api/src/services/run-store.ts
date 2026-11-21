import { Data, Effect } from "effect";
import type { Run, Submission } from "@council/contracts";
import type { Env } from "../env";

export class RunStoreError extends Data.TaggedError("RunStoreError")<{
  cause: unknown;
}> {}

export function coordinator(env: Env, runId: string) {
  return env.RUN_COORDINATOR.get(env.RUN_COORDINATOR.idFromName(runId));
}

export function createRun(env: Env, submission: Submission) {
  return Effect.tryPromise({
    try: async () => await coordinator(env, submission.submissionKey).submit(submission),
    catch: (cause) => new RunStoreError({ cause }),
  });
}

export function getRun(env: Env, runId: string) {
  return Effect.tryPromise({
    try: (): Promise<Run | null> => coordinator(env, runId).getRun(),
    catch: (cause) => new RunStoreError({ cause }),
  });
}
