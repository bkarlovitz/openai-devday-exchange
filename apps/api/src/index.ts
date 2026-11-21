import { Hono } from "hono";
import type { Env } from "./env";
import { evidence } from "./routes/evidence";
import { runs } from "./routes/runs";

const app = new Hono<{ Bindings: Env }>();
app.route("/api/runs", runs);
app.route("/api/dev/evidence", evidence);
app.all("/api/*", (c) => c.json({ error: "API route not found." }, 404));
app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Could not load or save this submission. Please retry." }, 503);
});
app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export { RunCoordinator } from "./coordinator/run-coordinator";
export { CheckRun } from "./workflows/check-run";
export default app;
