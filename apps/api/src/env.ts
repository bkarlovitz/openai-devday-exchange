import type { RunCoordinator } from "./coordinator/run-coordinator";

export interface Env {
  SUBMISSIONS: R2Bucket;
  RUN_COORDINATOR: DurableObjectNamespace<RunCoordinator>;
  CHECK_RUN: Workflow<{ runId: string }>;
  ASSETS: Fetcher;
}
