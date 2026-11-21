import { Hono } from "hono";
import { Effect, Schema } from "effect";
import { Submission, normalizeSubmission } from "@council/contracts";
import type { Env } from "../env";
import { createRun, getRun, coordinator } from "../services/run-store";

export const runs = new Hono<{ Bindings: Env }>();

runs.post("/", async (c) => {
  let input: unknown;
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: "Send a JSON submission." }, 400);
  }
  const decoded = await Effect.runPromise(
    Schema.decodeUnknown(Submission)(input).pipe(Effect.either),
  );
  if (decoded._tag === "Left") {
    return c.json({ error: decoded.left.message }, 400);
  }
  const result = await Effect.runPromise(createRun(c.env, normalizeSubmission(decoded.right)));
  if (result.conflict) {
    return c.json(
      { error: "This submission key was already used for different text or metadata." },
      409,
    );
  }
  return c.json(
    {
      runId: result.run.runId,
      url: `/runs/${result.run.runId}`,
    },
    202,
  );
});

runs.get("/:runId", async (c) => {
  const id = Schema.decodeUnknownOption(Schema.UUID)(c.req.param("runId"));
  if (id._tag === "None") {
    return c.json({ error: "Submission not found." }, 404);
  }
  const run = await Effect.runPromise(getRun(c.env, id.value.toLowerCase()));
  if (!run) {
    return c.json({ error: "Submission not found." }, 404);
  }
  return c.json(run);
});

runs.get("/:runId/claims/:claimId", async (c) => {
  const id = Schema.decodeUnknownOption(Schema.UUID)(c.req.param("runId"));
  const claimId = c.req.param("claimId");
  if (
    id._tag === "None" ||
    !/^[a-zA-Z0-9-]{1,100}$/.test(claimId) ||
    !claimId.startsWith(id.value.toLowerCase() + "-")
  ) {
    return c.json({ error: "Claim not found." }, 404);
  }
  const detail = await coordinator(c.env, id.value.toLowerCase()).getClaimJson(claimId);
  return detail
    ? c.body(detail, 200, { "Content-Type": "application/json" })
    : c.json({ error: "Claim not found." }, 404);
});
