import { Hono } from "hono";
import type { Context } from "hono";
import { Effect, ParseResult } from "effect";
import type { DatabaseError } from "../db/client";
import {
  EvidenceNotFound,
  QueryInputError,
  inspectDataset,
  searchCatalogue,
} from "../research/catalogue";
import { queryDataset } from "../research/query-dataset";
import { queryPublishedDataset } from "../research/query-sources";
import type { Env } from "../env";
import { readDocumentPassage, searchDocuments } from "../research/query-documents";

export const evidence = new Hono<{ Bindings: Env }>();

evidence.use("*", async (c, next) => {
  if (c.env.ENABLE_EVIDENCE_DEBUG !== "true") {
    return c.json({ error: "API route not found." }, 404);
  }
  if (!c.env.EVIDENCE_DB) {
    return c.json({ error: "Evidence database is not configured." }, 503);
  }
  await next();
});

evidence.onError((error, c) => {
  console.error("Evidence lookup failed", error);
  return c.json({ error: "Evidence database lookup failed." }, 503);
});

async function toolResponse(
  c: Context<{ Bindings: Env }>,
  execute: () => Effect.Effect<unknown, DatabaseError>,
) {
  try {
    const result = await Effect.runPromise(execute().pipe(Effect.either));
    if (result._tag === "Right")
      return c.body(JSON.stringify(result.right), 200, { "Content-Type": "application/json" });
    const cause = result.left.cause;
    if (cause instanceof QueryInputError) return c.json({ error: cause.message }, 400);
    if (cause instanceof EvidenceNotFound) return c.json({ error: cause.message }, 404);
    console.error("Evidence query failed", cause);
    return c.json({ error: "Evidence database lookup failed." }, 503);
  } catch (error) {
    if (ParseResult.isParseError(error) || error instanceof SyntaxError) {
      return c.json(
        {
          error:
            "Invalid evidence query. Inspect available fields and use the documented query schema.",
        },
        400,
      );
    }
    throw error;
  }
}

evidence.get("/catalogue", async (c) => {
  const query = c.req.query("q");
  if (query !== undefined && (!query.trim() || query.length > 200)) {
    return c.json({ error: "Provide a query between 1 and 200 characters." }, 400);
  }
  return toolResponse(c, () =>
    searchCatalogue(c.env, { query: query?.trim() ?? "", limit: 100 }).pipe(
      Effect.map((result) =>
        result.datasets.map((entry) => ({
          ...entry,
          datasetId: entry.id,
          resourceCount: entry.resources,
        })),
      ),
    ),
  );
});

evidence.get("/catalogue/:datasetId", (c) =>
  toolResponse(c, () =>
    inspectDataset(c.env, { datasetId: c.req.param("datasetId") }).pipe(
      Effect.map((result) => ({
        ...result.dataset,
        datasetId: result.dataset.id,
        resources: result.resources.map((resource) => ({
          ...resource.snapshot,
          snapshotId: resource.snapshot.id,
          sourceUrl: resource.snapshot.resourceUrl,
          fields: resource.fields,
          sampleRows: resource.sampleRows,
        })),
      })),
    ),
  ),
);

evidence.post("/query-dataset", async (c) => {
  const input = await c.req.json().catch(() => null);
  return toolResponse(c, () => queryPublishedDataset(c.env, input));
});

evidence.post("/search", async (c) => {
  const input = await c.req.json().catch(() => null);
  return toolResponse(c, () => searchCatalogue(c.env, input));
});

evidence.post("/inspect", async (c) => {
  const input = await c.req.json().catch(() => null);
  return toolResponse(c, () => inspectDataset(c.env, input));
});

evidence.post("/query", async (c) => {
  const input = await c.req.json().catch(() => null);
  return toolResponse(c, () => queryDataset(c.env, input));
});

evidence.get("/documents", (c) =>
  toolResponse(c, () =>
    searchDocuments(c.env, {
      query: c.req.query("q"),
      datasetId: c.req.query("datasetId"),
      snapshotId: c.req.query("snapshotId"),
    }),
  ),
);

evidence.get("/documents/:snapshotId/:passageNumber", (c) => {
  const { snapshotId, passageNumber } = c.req.param();
  return toolResponse(c, () =>
    readDocumentPassage(c.env, {
      snapshotId,
      passageNumber: /^[1-9]\d{0,9}$/.test(passageNumber) ? Number(passageNumber) : undefined,
    }),
  );
});
