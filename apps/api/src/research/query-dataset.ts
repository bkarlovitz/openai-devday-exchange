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

type AggregateResult = {
  value: string | null;
  matchedRows: number;
  missingRows: number;
};

type SourceRow = {
  rowNumber: number;
  data: Record<string, unknown>;
};

function filtersFor(input: QueryDatasetInput) {
  switch (input.datasetId) {
    case "incasol":
      return sql`AND data->>'Àmbit territorial' = 'Municipi'
        AND data->>'Codi territorial' = ${input.filters.municipalityCode}
        AND data->>'Any' = ${input.filters.year}
        AND data->>'Període' = ${input.filters.period}
        AND data->>'Tram de preus' = ${input.filters.priceBand}`;
    case "population":
      return sql`AND data->>'Data_Referencia' = ${input.filters.referenceDate}
        ${input.filters.districtCode ? sql`AND data->>'Codi_Districte' = ${input.filters.districtCode}` : sql``}
        ${input.filters.neighbourhoodCode ? sql`AND data->>'Codi_Barri' = ${input.filters.neighbourhoodCode}` : sql``}
        ${input.filters.censusSection ? sql`AND data->>'Seccio_Censal' = ${input.filters.censusSection}` : sql``}`;
    case "tourist-flats":
      return sql`
        ${input.filters.districtCode ? sql`AND data->>'CODI_DISTRICTE' = ${input.filters.districtCode}` : sql``}
        ${input.filters.neighbourhoodCode ? sql`AND data->>'CODI_BARRI' = ${input.filters.neighbourhoodCode}` : sql``}`;
    case "ine-59061":
      return sql`AND data->>'COD' = ${input.filters.seriesCode}
        AND data->>'Anyo' = ${input.filters.year}`;
  }
}

function decimal(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === "string" && /^-?[0-9]+(?:\.[0-9]+)?$/.test(value) ? value : null;
}

function evidenceRow(datasetId: QueryDatasetInput["datasetId"], row: SourceRow) {
  const { data } = row;
  switch (datasetId) {
    case "incasol":
      return {
        ...row,
        observationPeriod: { year: data.Any, label: data["Període"] },
        rent: { value: decimal(data.Renda), unit: "EUR/month" },
      };
    case "population":
      return {
        ...row,
        observationPeriod: { referenceDate: data.Data_Referencia },
        population: { value: decimal(data.Valor), unit: "people" },
      };
    case "tourist-flats":
      return {
        ...row,
        observationPeriod: null,
        capacity: { value: decimal(data.NUMERO_PLACES), unit: "places" },
      };
    case "ine-59061":
      return {
        ...row,
        observationPeriod: { year: data.Anyo, periodCode: data.FK_Periodo },
        observation: {
          value: data.Secreto === true ? null : decimal(data.Valor),
          unitCode: data.FK_Unidad,
          scaleCode: data.FK_Escala,
        },
      };
  }
}

export function queryDataset(binding: Hyperdrive, input: QueryDatasetInput) {
  const { datasetId, resourceKey, snapshotId, afterRow } = input;
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

    if ("aggregate" in input && input.aggregate) {
      const population = input.aggregate === "sum_population";
      const operand = population
        ? sql`CASE WHEN data->>'Valor' ~ '^[0-9]+$' THEN (data->>'Valor')::numeric END`
        : sql`NULLIF(btrim(data->>'N_EXPEDIENT'), '')`;
      const total = population ? sql`sum(operand)` : sql`count(DISTINCT operand)`;
      const result = await db.execute<AggregateResult>(sql`
        SELECT CASE WHEN count(*) > 0 AND count(operand) = count(*)
                    THEN (${total})::text END AS value,
               count(*)::integer AS "matchedRows",
               (count(*) - count(operand))::integer AS "missingRows"
        FROM (
          SELECT ${operand} AS operand
          FROM source_row
          WHERE snapshot_id = ${snapshot.id}::bigint
            ${filtersFor(input)}
        ) matched
      `);
      return {
        snapshot,
        query: { ...input, snapshotId: snapshot.id },
        aggregate: {
          operation: input.aggregate,
          unit: population ? "people" : "registered tourist flats",
          ...result.rows[0],
        },
      };
    }

    const result = await db.execute<SourceRow>(sql`
      SELECT row_number AS "rowNumber", data
      FROM source_row
      WHERE snapshot_id = ${snapshot.id}::bigint AND row_number > ${afterRow ?? 0}
        ${filtersFor(input)}
      ORDER BY row_number LIMIT ${limit + 1}
    `);
    const page = result.rows.slice(0, limit);
    const rows = page.map((row) => evidenceRow(datasetId, row));
    return {
      snapshot,
      query: { ...input, snapshotId: snapshot.id, limit },
      rows,
      nextAfterRow: result.rows.length > limit ? (page.at(-1)?.rowNumber ?? null) : null,
    };
  });
}
