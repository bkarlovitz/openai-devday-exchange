import type {
  DocumentPassage,
  ReadDocumentPassageInput,
  SearchDocumentsInput,
} from "@council/contracts";
import { sql } from "drizzle-orm";
import { withEvidenceDb } from "../db/client";

const fields = sql`
  s.dataset_id AS "datasetId", p.snapshot_id::text AS "snapshotId",
  p.passage_number AS "passageNumber", p.page_number AS "pageNumber",
  p.html_location AS "htmlLocation", s.resource_url AS "sourceUrl",
  s.sha256, p.extraction_version AS "extractionVersion", p.passage_text AS "text"
`;

export function searchDocuments(binding: Hyperdrive, input: SearchDocumentsInput) {
  const { query, datasetId, snapshotId, limit = 10 } = input;
  return withEvidenceDb(binding, async (db) => {
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

export function readDocumentPassage(
  binding: Hyperdrive,
  { snapshotId, passageNumber }: ReadDocumentPassageInput,
) {
  return withEvidenceDb(binding, async (db) => {
    const result = await db.execute<DocumentPassage>(sql`
      SELECT ${fields}
      FROM source_document_passage p
      JOIN snapshot s ON s.id = p.snapshot_id
      WHERE p.snapshot_id = ${snapshotId}::bigint AND p.passage_number = ${passageNumber}
    `);
    return result.rows[0];
  });
}
