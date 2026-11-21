import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { evidence } from "./routes/evidence";
import { runs } from "./routes/runs";

const app = new Hono<{ Bindings: Env }>();
app.use(
  "/api/runs/*",
  cors({
    origin: (origin, c) =>
      (c.env as Env).EXTENSION_ORIGINS?.split(",")
        .map((value) => value.trim())
        .includes(origin)
        ? origin
        : undefined,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 3600,
  }),
);
app.route("/api/runs", runs);
app.route("/api/dev/evidence", evidence);
app.all("/api/*", (c) => c.json({ error: "API route not found." }, 404));
app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Could not load or save this submission. Please retry." }, 503);
});
app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export { YoutubeImporter } from "./containers/youtube-importer";
export { RunCoordinator } from "./coordinator/run-coordinator";
export { CheckRun } from "./workflows/check-run";
export default app;
