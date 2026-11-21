import type { QueryDatasetInput } from "@council/contracts";
import { sql } from "drizzle-orm";
import { withEvidenceDb } from "../db/client";

type Snapshot = {
  id: string;
  datasetId: string;
  resourceKey: string;
  sourceUrl: string;
  sha256: string;
  fetchedAt: string;
  lastSeenAt: string;
};

type IncasolRow = {
  rowNumber: number;
  data: Record<string, string>;
};

export function queryDataset(binding: Hyperdrive, input: QueryDatasetInput) {
  const { datasetId, resourceKey, snapshotId, filters, afterRow } = input;
  const limit = input.limit ?? 25;
  return withEvidenceDb(binding, async (db) => {
    const snapshots = await db.execute<Snapshot>(sql`
      SELECT id::text, dataset_id AS "datasetId", resource_key AS "resourceKey",
             resource_url AS "sourceUrl", sha256, fetched_at::text AS "fetchedAt",
             last_seen_at::text AS "lastSeenAt"
      FROM ${snapshotId ? sql`snapshot` : sql`latest_snapshot`}
      WHERE dataset_id = ${datasetId} AND resource_key = ${resourceKey}
        ${snapshotId ? sql`AND id = ${snapshotId}::bigint` : sql``}
    `);
    const snapshot = snapshots.rows[0];
    if (!snapshot) {
      return null;
    }

    const result = await db.execute<IncasolRow>(sql`
      SELECT row_number AS "rowNumber", data
      FROM source_row
      WHERE snapshot_id = ${snapshot.id}::bigint AND row_number > ${afterRow ?? 0}
        AND data->>'Àmbit territorial' = 'Municipi'
        AND data->>'Codi territorial' = ${filters.municipalityCode}
        AND data->>'Any' = ${filters.year}
        AND data->>'Període' = ${filters.period}
        AND data->>'Tram de preus' = ${filters.priceBand}
      ORDER BY row_number LIMIT ${limit + 1}
    `);
    const page = result.rows.slice(0, limit);
    const rows = page.map(({ rowNumber, data }) => ({
      rowNumber,
      data,
      observationPeriod: { year: data.Any, label: data["Període"] },
      rent: {
        value: /^[0-9]+(?:\.[0-9]+)?$/.test(data.Renda ?? "") ? data.Renda : null,
        unit: "EUR/month",
      },
    }));
    return {
      snapshot,
      query: { ...input, snapshotId: snapshot.id, limit },
      rows,
      nextAfterRow: result.rows.length > limit ? (page.at(-1)?.rowNumber ?? null) : null,
    };
  });
}
