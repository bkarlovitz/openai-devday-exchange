import { fileURLToPath } from "node:url";
import path from "node:path";
import { config } from "dotenv";
import alchemy from "alchemy";
import { Assets, DurableObjectNamespace, R2Bucket, Worker, Workflow } from "alchemy/cloudflare";

const root = fileURLToPath(new URL("../../", import.meta.url));
config({ path: path.join(root, ".env") });
const app = await alchemy("council-checker", { stage: process.env.ALCHEMY_STAGE ?? "dev" });
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
    SUBMISSIONS: submissions,
    RUN_COORDINATOR: coordinator,
    CHECK_RUN: workflow,
    ASSETS: await Assets({ path: path.join(root, "apps/web/dist") }),
  },
});
console.log(`Council Check: ${worker.url}`);
await app.finalize();
