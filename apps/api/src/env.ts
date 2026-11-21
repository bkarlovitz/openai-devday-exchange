import type { YoutubeImporter } from "./containers/youtube-importer";
import type { RunCoordinator } from "./coordinator/run-coordinator";
import type { TranslationParams } from "./workflows/translate-claim";

export interface CheckRunParams {
  runId: string;
  resumeResearch?: boolean;
  claimIds?: string[];
  reuseExtractionAttemptId?: string;
}

export interface Env {
  SUBMISSIONS: R2Bucket;
  RUN_COORDINATOR: DurableObjectNamespace<RunCoordinator>;
  CHECK_RUN: Workflow<CheckRunParams>;
  TRANSLATE_CLAIM: Workflow<TranslationParams>;
  EVIDENCE_DB?: Hyperdrive;
  ENABLE_EVIDENCE_DEBUG?: string;
  ASSETS: Fetcher;
  OPENAI_API_KEY?: string;
  EXTRACT_MODEL?: string;
  DECISION_MODEL?: string;
  RESEARCH_MODEL?: string;
  SEARCH_MODEL?: string;
  EXPLAIN_MODEL?: string;
  YOUTUBE_IMPORTER?: DurableObjectNamespace<YoutubeImporter>;
  YOUTUBE_IMPORT_URL?: string;
  YOUTUBE_IMPORT_TOKEN?: string;
  EXTENSION_ORIGINS?: string;
}
