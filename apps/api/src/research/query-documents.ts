import {
  type DocumentPassage,
  type DocumentExtraction,
  InspectDocumentInput,
  ReadDocumentPassageInput,
  SearchDocumentsInput,
} from "@council/contracts";
import { sql } from "drizzle-orm";
import { Schema } from "effect";
import { databaseEffect } from "../db/client";
import { latestSnapshot, snapshot, sourceDocument, sourceDocumentPassage } from "../db/schema";
import type { Env } from "../env";
import { EvidenceNotFound } from "./catalogue";

const fields = sql`
  s.dataset_id AS "datasetId", p.snapshot_id::text AS "snapshotId",
  p.passage_number AS "passageNumber", p.page_number AS "pageNumber",
  p.html_location AS "htmlLocation", s.resource_url AS "sourceUrl",
  s.sha256, p.extraction_version AS "extractionVersion", p.passage_text AS "text"
`;

export function searchDocuments(env: Env, input: unknown) {
  const {
    query,
    datasetId,
    snapshotId,
    limit = 10,
  } = Schema.decodeUnknownSync(SearchDocumentsInput, { onExcessProperty: "error" })(input);
  return databaseEffect(env, async (db) => {
    const result = await db.execute<DocumentPassage>(sql`
      SELECT ${fields}
      FROM ${sourceDocumentPassage} p
      JOIN ${snapshotId ? snapshot : latestSnapshot} s ON s.id = p.snapshot_id
      CROSS JOIN plainto_tsquery('simple', ${query}) q
      WHERE p.search_vector @@ q
        ${datasetId ? sql`AND s.dataset_id = ${datasetId}` : sql``}
        ${snapshotId ? sql`AND s.id = ${snapshotId}::bigint` : sql``}
      ORDER BY ts_rank(p.search_vector, q) DESC, p.snapshot_id, p.passage_number
      LIMIT ${limit}
    `);
    return result.rows;
  });
}

export function readDocumentPassage(env: Env, input: unknown) {
  const { snapshotId, passageNumber } = Schema.decodeUnknownSync(ReadDocumentPassageInput, {
    onExcessProperty: "error",
  })(input);
  return databaseEffect(env, async (db) => {
    const result = await db.execute<DocumentPassage>(sql`
      SELECT ${fields}
      FROM ${sourceDocumentPassage} p
      JOIN ${snapshot} s ON s.id = p.snapshot_id
      WHERE p.snapshot_id = ${snapshotId}::bigint AND p.passage_number = ${passageNumber}
    `);
    const passage = result.rows[0];
    if (!passage) throw new EvidenceNotFound("Passage not found.");
    return passage;
  });
}

export function inspectDocument(env: Env, input: unknown) {
  const { snapshotId } = Schema.decodeUnknownSync(InspectDocumentInput, {
    onExcessProperty: "error",
  })(input);
  return databaseEffect(env, async (db) => {
    const result = await db.execute<DocumentExtraction>(sql`
      SELECT s.dataset_id AS "datasetId", s.id::text AS "snapshotId",
        s.resource_url AS "sourceUrl", s.sha256, d.content_type AS "contentType",
        d.extraction_status AS "status", d.extraction_version AS "extractionVersion",
        d.extracted_at::text AS "extractedAt",
        (SELECT count(*)::int FROM ${sourceDocumentPassage} p WHERE p.snapshot_id = s.id)
          AS "passageCount"
      FROM ${sourceDocument} d JOIN ${snapshot} s ON s.id = d.snapshot_id
      WHERE d.snapshot_id = ${snapshotId}::bigint
    `);
    const document = result.rows[0];
    if (!document) throw new EvidenceNotFound("Stored document not found.");
    return document;
  });
}
