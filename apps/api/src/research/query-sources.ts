import { Effect, Schema } from "effect";
import { QueryDatasetInput } from "@council/contracts";
import type { Env } from "../env";
import { queryDataset } from "./query-dataset";

type SourceRow = { rowNumber: number; data: Record<string, unknown> };
type Filter = { field: string; op: "eq"; value: string };

function filtersFor(input: QueryDatasetInput): Filter[] {
  switch (input.datasetId) {
    case "incasol":
      return [
        { field: "Àmbit territorial", op: "eq", value: "Municipi" },
        { field: "Codi territorial", op: "eq", value: input.filters.municipalityCode },
        { field: "Any", op: "eq", value: input.filters.year },
        { field: "Període", op: "eq", value: input.filters.period },
        { field: "Tram de preus", op: "eq", value: input.filters.priceBand },
      ];
    case "population": {
      const filters: Filter[] = [
        { field: "Data_Referencia", op: "eq", value: input.filters.referenceDate },
      ];
      if (input.filters.districtCode)
        filters.push({ field: "Codi_Districte", op: "eq", value: input.filters.districtCode });
      if (input.filters.neighbourhoodCode)
        filters.push({ field: "Codi_Barri", op: "eq", value: input.filters.neighbourhoodCode });
      if (input.filters.censusSection)
        filters.push({ field: "Seccio_Censal", op: "eq", value: input.filters.censusSection });
      return filters;
    }
    case "tourist-flats": {
      const filters: Filter[] = [];
      if (input.filters.districtCode)
        filters.push({ field: "CODI_DISTRICTE", op: "eq", value: input.filters.districtCode });
      if (input.filters.neighbourhoodCode)
        filters.push({ field: "CODI_BARRI", op: "eq", value: input.filters.neighbourhoodCode });
      return filters;
    }
    case "ine-59061":
      return [
        { field: "COD", op: "eq", value: input.filters.seriesCode },
        { field: "Anyo", op: "eq", value: input.filters.year },
      ];
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

export function queryPublishedDataset(env: Env, input: unknown) {
  const options = Schema.decodeUnknownSync(QueryDatasetInput, { onExcessProperty: "error" })(input);
  return queryDataset(env, {
    datasetId: options.datasetId,
    resourceKey: options.resourceKey,
    snapshotId: options.snapshotId,
    afterRow: options.afterRow,
    limit: options.limit ?? 25,
    filters: filtersFor(options),
  }).pipe(
    Effect.map((result) => ({
      snapshot: { ...result.snapshot, sourceUrl: result.snapshot.resourceUrl },
      query: { ...options, snapshotId: result.snapshot.id, limit: options.limit ?? 25 },
      rows: result.rows.map((row) => evidenceRow(options.datasetId, row)),
      nextAfterRow:
        result.totalRows > result.rows.length ? (result.rows.at(-1)?.rowNumber ?? null) : null,
    })),
  );
}
