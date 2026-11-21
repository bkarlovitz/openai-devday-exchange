import { sql } from "drizzle-orm";
import { withEvidenceDb } from "../db/client";

type DocumentPassage = {
  datasetId: string;
  snapshotId: string;
  passageNumber: number;
  pageNumber: number | null;
  htmlLocation: string | null;
  sourceUrl: string;
  sha256: string;
  text: string;
};

const fields = sql`
  s.dataset_id AS "datasetId", p.snapshot_id::text AS "snapshotId",
  p.passage_number AS "passageNumber", p.page_number AS "pageNumber",
  p.html_location AS "htmlLocation", s.resource_url AS "sourceUrl",
  s.sha256, p.passage_text AS "text"
`;

export function searchDocuments(binding: Hyperdrive, query: string, datasetId?: string) {
  return withEvidenceDb(binding, async (db) => {
    const result = await db.execute<DocumentPassage>(sql`
      SELECT ${fields}
      FROM source_document_passage p
      JOIN latest_snapshot s ON s.id = p.snapshot_id
      CROSS JOIN plainto_tsquery('simple', ${query}) q
      WHERE p.search_vector @@ q
        AND (${datasetId ?? null}::text IS NULL OR s.dataset_id = ${datasetId ?? null})
      ORDER BY ts_rank(p.search_vector, q) DESC, p.snapshot_id, p.passage_number
      LIMIT 10
    `);
    return result.rows;
  });
}

export function readDocumentPassage(
  binding: Hyperdrive,
  snapshotId: string,
  passageNumber: number,
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
