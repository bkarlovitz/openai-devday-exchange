import type { RunCoordinator } from "./coordinator/run-coordinator";

export interface Env {
  SUBMISSIONS: R2Bucket;
  RUN_COORDINATOR: DurableObjectNamespace<RunCoordinator>;
  CHECK_RUN: Workflow<{ runId: string }>;
  EVIDENCE_DB?: Hyperdrive;
  ENABLE_EVIDENCE_DEBUG?: string;
  ASSETS: Fetcher;
  OPENAI_API_KEY?: string;
  EXTRACT_MODEL?: string;
}
