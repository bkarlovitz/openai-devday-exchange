import { QueryDatasetInput } from "@council/contracts";
import { Schema } from "effect";
import { Hono } from "hono";
import type { Env } from "../env";
import { inspectDataset, searchCatalogue } from "../research/catalogue";
import { queryDataset } from "../research/query-dataset";
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

evidence.get("/catalogue", async (c) => {
  const query = c.req.query("q")?.trim();
  if (query !== undefined && (!query || query.length > 200)) {
    return c.json({ error: "Provide a query between 1 and 200 characters." }, 400);
  }
  return c.json(await searchCatalogue(c.env.EVIDENCE_DB!, query));
});

evidence.get("/catalogue/:datasetId", async (c) => {
  const result = await inspectDataset(c.env.EVIDENCE_DB!, c.req.param("datasetId"));
  return result ? c.json(result) : c.json({ error: "Dataset not found." }, 404);
});

evidence.get("/documents", async (c) => {
  const query = c.req.query("q")?.trim();
  if (!query || query.length > 200) {
    return c.json({ error: "Provide a query between 1 and 200 characters." }, 400);
  }
  return c.json(await searchDocuments(c.env.EVIDENCE_DB!, query, c.req.query("datasetId")));
});

evidence.get("/documents/:snapshotId/:passageNumber", async (c) => {
  const { snapshotId, passageNumber } = c.req.param();
  const number = Number(passageNumber);
  if (
    !/^[1-9]\d{0,18}$/.test(snapshotId) ||
    BigInt(snapshotId) > 9223372036854775807n ||
    !/^[1-9]\d{0,9}$/.test(passageNumber) ||
    number > 2147483647
  ) {
    return c.json({ error: "Invalid snapshot or passage identifier." }, 400);
  }
  const passage = await readDocumentPassage(c.env.EVIDENCE_DB!, snapshotId, number);
  return passage ? c.json(passage) : c.json({ error: "Passage not found." }, 404);
});

evidence.post("/query-dataset", async (c) => {
  const body: unknown = await c.req.json().catch(() => undefined);
  const decoded = Schema.decodeUnknownEither(QueryDatasetInput, {
    onExcessProperty: "error",
  })(body);
  if (decoded._tag === "Left" || (decoded.right.afterRow && !decoded.right.snapshotId)) {
    return c.json({ error: "Invalid dataset query. Pagination requires a snapshot ID." }, 400);
  }

  const result = await queryDataset(c.env.EVIDENCE_DB!, decoded.right);
  return result ? c.json(result) : c.json({ error: "Snapshot not found for this resource." }, 404);
});
