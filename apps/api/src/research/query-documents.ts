import {
  type DocumentPassage,
  ReadDocumentPassageInput,
  SearchDocumentsInput,
} from "@council/contracts";
import { sql } from "drizzle-orm";
import { Schema } from "effect";
import { databaseEffect } from "../db/client";
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
      FROM source_document_passage p
      JOIN ${snapshotId ? sql`snapshot` : sql`latest_snapshot`} s ON s.id = p.snapshot_id
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
      FROM source_document_passage p
      JOIN snapshot s ON s.id = p.snapshot_id
      WHERE p.snapshot_id = ${snapshotId}::bigint AND p.passage_number = ${passageNumber}
    `);
    const passage = result.rows[0];
    if (!passage) throw new EvidenceNotFound("Passage not found.");
    return passage;
  });
}
