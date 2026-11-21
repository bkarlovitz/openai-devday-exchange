import type { RunCoordinator } from "./coordinator/run-coordinator";

export interface Env {
  SUBMISSIONS: R2Bucket;
  RUN_COORDINATOR: DurableObjectNamespace<RunCoordinator>;
  CHECK_RUN: Workflow<{ runId: string; resumeResearch?: boolean }>;
  EVIDENCE_DB?: Hyperdrive;
  ENABLE_EVIDENCE_DEBUG?: string;
  ASSETS: Fetcher;
  OPENAI_API_KEY?: string;
  EXTRACT_MODEL?: string;
  DECISION_MODEL?: string;
  RESEARCH_MODEL?: string;
  SEARCH_MODEL?: string;
  EXPLAIN_MODEL?: string;
  EXTENSION_ORIGINS?: string;
}
