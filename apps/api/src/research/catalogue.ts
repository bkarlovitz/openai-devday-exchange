import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { Schema } from "effect";
import { CatalogueInput, InspectDatasetInput } from "@council/contracts";
import type { SnapshotReference } from "@council/contracts";
import type { Env } from "../env";
import { databaseEffect } from "../db/client";
import { dataset, latestSnapshot, snapshot, sourceRow } from "../db/schema";
import { describeFields } from "./dataset-fields";

export class QueryInputError extends Error {}
export class EvidenceNotFound extends Error {}

export function snapshotReference(row: typeof snapshot.$inferSelect): SnapshotReference {
  return {
    id: row.id.toString(),
    datasetId: row.datasetId,
    resourceKey: row.resourceKey,
    resourceUrl: row.resourceUrl,
    sha256: row.sha256,
    fetchedAt: row.fetchedAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    rowCount: row.rowCount,
  };
}

export function searchCatalogue(env: Env, input: unknown) {
  const options = Schema.decodeUnknownSync(CatalogueInput)(input);
  return databaseEffect(env, async (db) => {
    const vector = options.embedding ? JSON.stringify(options.embedding) : null;
    const distance = vector
      ? sql<
          number | null
        >`CASE WHEN ${dataset.embeddingModel} = 'text-embedding-3-small' THEN ${dataset.embedding} <=> ${vector}::vector ELSE NULL END`
      : sql<null>`NULL`;
    const condition =
      options.query && !vector
        ? or(
            ilike(dataset.id, `%${options.query}%`),
            ilike(dataset.searchText, `%${options.query}%`),
          )
        : undefined;
    const rows = await db
      .select({
        id: dataset.id,
        sourceUrl: dataset.sourceUrl,
        description: dataset.searchText,
        updatedAt: dataset.updatedAt,
        distance,
        resources: sql<number>`(SELECT count(*)::int FROM latest_snapshot l WHERE l.dataset_id = "dataset"."id")`,
      })
      .from(dataset)
      .where(condition)
      .orderBy(...(vector ? [sql`${distance} ASC NULLS LAST`, asc(dataset.id)] : [asc(dataset.id)]))
      .limit(options.limit);
    return { datasets: rows, embeddingModel: vector ? "text-embedding-3-small" : null };
  });
}

export function inspectDataset(env: Env, input: unknown) {
  const options = Schema.decodeUnknownSync(InspectDatasetInput)(input);
  return databaseEffect(env, async (db) => {
    const [entry] = await db.select().from(dataset).where(eq(dataset.id, options.datasetId));
    if (!entry) throw new EvidenceNotFound("Dataset not found.");
    const table = options.snapshotId ? snapshot : latestSnapshot;
    const resources = await db
      .select()
      .from(table)
      .where(
        and(
          eq(table.datasetId, options.datasetId),
          options.snapshotId ? eq(table.id, BigInt(options.snapshotId)) : undefined,
          options.resourceKey ? eq(table.resourceKey, options.resourceKey) : undefined,
        ),
      )
      .orderBy(asc(table.resourceKey));
    if (!resources.length) throw new EvidenceNotFound("Dataset snapshot not found.");
    const details = [];
    for (const resource of resources) {
      const samples = await db
        .select({ rowNumber: sourceRow.rowNumber, data: sourceRow.data })
        .from(sourceRow)
        .where(eq(sourceRow.snapshotId, resource.id))
        .orderBy(asc(sourceRow.rowNumber))
        .limit(2);
      details.push({
        snapshot: snapshotReference(resource),
        fields: describeFields(options.datasetId, samples[0]?.data ?? {}),
        sampleRows: samples,
      });
    }
    return {
      dataset: { id: entry.id, sourceUrl: entry.sourceUrl, description: entry.searchText },
      resources: details,
    };
  });
}
