import { fileURLToPath } from "node:url";
import path from "node:path";
import { config } from "dotenv";
import alchemy from "alchemy";
import {
  Assets,
  DurableObjectNamespace,
  Hyperdrive,
  R2Bucket,
  Worker,
  Workflow,
} from "alchemy/cloudflare";

const root = fileURLToPath(new URL("../../", import.meta.url));
config({ path: path.join(root, ".env") });
for (const name of ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"]) {
  if (!process.env[name]) delete process.env[name];
}
const app = await alchemy("council-checker", {
  stage: process.env.ALCHEMY_STAGE ?? "dev",
  password:
    process.env.ALCHEMY_PASSWORD ||
    (process.argv.includes("--dev") ? "local-development" : undefined),
});
// The pinned provider initializes an API client in local mode, even though all
// bindings are emulated. Supply an emulator identity only in that mode.
if (app.local) {
  process.env.CLOUDFLARE_ACCOUNT_ID ||= "00000000000000000000000000000000";
  process.env.CLOUDFLARE_API_TOKEN ||= "local-emulator";
}
const name = `council-checker-${app.stage}`;

const submissions = await R2Bucket("submissions", { name: `${name}-submissions` });
const coordinator = DurableObjectNamespace("run-coordinator", {
  className: "RunCoordinator",
  sqlite: true,
});
const workflow = Workflow("check-run", {
  workflowName: `${name}-check-run`,
  className: "CheckRun",
});
const evidenceOrigin = app.local
  ? process.env.LOCAL_EVIDENCE_DATABASE_URL ||
    "postgresql://council:council_local@127.0.0.1:5432/council"
  : process.env.HYPERDRIVE_ORIGIN || process.env.DATABASE_URL;
const evidenceDb = evidenceOrigin
  ? await Hyperdrive("evidence-db", {
      origin: alchemy.secret(evidenceOrigin),
      caching: { disabled: true },
    })
  : undefined;

const worker = await Worker("app", {
  name,
  entrypoint: path.join(root, "apps/api/src/index.ts"),
  compatibilityDate: "2026-07-15",
  compatibilityFlags: ["nodejs_compat"],
  url: true,
  dev: { port: 8787 },
  assets: {
    not_found_handling: "single-page-application",
    run_worker_first: ["/api/*"],
  },
  bindings: {
    ...(evidenceDb ? { EVIDENCE_DB: evidenceDb } : {}),
    ...(app.local || process.env.ENABLE_EVIDENCE_DEBUG === "true"
      ? { ENABLE_EVIDENCE_DEBUG: "true" }
      : {}),
    SUBMISSIONS: submissions,
    RUN_COORDINATOR: coordinator,
    CHECK_RUN: workflow,
    EXTRACT_MODEL: process.env.EXTRACT_MODEL ?? "gpt-5.4-mini",
    ...(process.env.OPENAI_API_KEY
      ? { OPENAI_API_KEY: alchemy.secret(process.env.OPENAI_API_KEY) }
      : {}),
    ASSETS: await Assets({ path: path.join(root, "apps/web/dist") }),
  },
});
console.log(`Council Check: ${worker.url}`);
await app.finalize();
