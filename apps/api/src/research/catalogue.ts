import { sql } from "drizzle-orm";
import { withEvidenceDb } from "../db/client";

type CatalogueEntry = {
  datasetId: string;
  sourceUrl: string;
  description: string;
  resourceCount: number;
};

type CatalogueResource = {
  resourceKey: string;
  snapshotId: string;
  sourceUrl: string;
  sha256: string;
  fetchedAt: string;
  lastSeenAt: string;
  rowCount: number;
};

export function searchCatalogue(binding: Hyperdrive, query?: string) {
  const document = sql`to_tsvector('simple', d.id || ' ' || d.search_text)`;
  return withEvidenceDb(binding, async (db) => {
    const result = await db.execute<CatalogueEntry>(sql`
      SELECT d.id AS "datasetId", d.source_url AS "sourceUrl", d.search_text AS "description",
        (SELECT count(*)::integer FROM latest_snapshot s WHERE s.dataset_id = d.id) AS "resourceCount"
      FROM dataset d
      ${
        query
          ? sql`CROSS JOIN plainto_tsquery('simple', ${query}) AS q
                WHERE ${document} @@ q
                ORDER BY ts_rank(${document}, q) DESC, d.id`
          : sql`ORDER BY d.id`
      }
      LIMIT 100
    `);
    return result.rows;
  });
}

export function inspectDataset(binding: Hyperdrive, datasetId: string) {
  return withEvidenceDb(binding, async (db) => {
    const result = await db.execute<Omit<CatalogueEntry, "resourceCount">>(sql`
      SELECT id AS "datasetId", source_url AS "sourceUrl", search_text AS "description"
      FROM dataset WHERE id = ${datasetId}
    `);
    const dataset = result.rows[0];
    if (!dataset) {
      return null;
    }
    const resources = await db.execute<CatalogueResource>(sql`
      SELECT resource_key AS "resourceKey", id::text AS "snapshotId",
             resource_url AS "sourceUrl", sha256, fetched_at::text AS "fetchedAt",
             last_seen_at::text AS "lastSeenAt", row_count AS "rowCount"
      FROM latest_snapshot WHERE dataset_id = ${datasetId}
      ORDER BY resource_key
    `);
    return { ...dataset, resources: resources.rows };
  });
}
