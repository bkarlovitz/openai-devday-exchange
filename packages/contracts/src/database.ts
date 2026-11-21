import { Schema } from "effect";

export const SnapshotId = Schema.String.pipe(
  Schema.pattern(/^[1-9][0-9]{0,18}$/),
  Schema.filter((value) => BigInt(value) <= 9223372036854775807n),
);
const Field = Schema.String.pipe(Schema.minLength(1), Schema.maxLength(128));

export const CatalogueInput = Schema.Struct({
  query: Schema.optionalWith(Schema.String.pipe(Schema.maxLength(200)), { default: () => "" }),
  limit: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.between(1, 100)), {
    default: () => 20,
  }),
  embedding: Schema.optional(
    Schema.Array(Schema.Number.pipe(Schema.finite())).pipe(Schema.itemsCount(1536)),
  ),
  embeddingModel: Schema.optional(Schema.Literal("text-embedding-3-small")),
}).pipe(
  Schema.filter((input) => !input.embedding || input.embeddingModel === "text-embedding-3-small", {
    message: () => "Query embeddings must identify text-embedding-3-small.",
  }),
);

export const InspectDatasetInput = Schema.Struct({
  datasetId: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(128)),
  snapshotId: Schema.optional(SnapshotId),
  resourceKey: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
});
export type InspectDatasetInput = typeof InspectDatasetInput.Type;

export const DatasetQueryInput = Schema.Struct({
  datasetId: Schema.Literal("tourist-flats", "population", "incasol", "ine-59061"),
  snapshotId: Schema.optional(SnapshotId),
  resourceKey: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
  filters: Schema.optionalWith(
    Schema.Array(
      Schema.Struct({
        field: Field,
        op: Schema.Literal("eq", "ne", "contains", "gt", "gte", "lt", "lte"),
        value: Schema.String.pipe(Schema.maxLength(500)),
      }),
    ).pipe(Schema.maxItems(12)),
    { default: () => [] },
  ),
  fields: Schema.optional(Schema.Array(Field).pipe(Schema.minItems(1), Schema.maxItems(30))),
  orderBy: Schema.optional(
    Schema.Struct({ field: Field, direction: Schema.Literal("asc", "desc") }),
  ),
  limit: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.between(1, 100)), {
    default: () => 25,
  }),
  offset: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.between(0, 100000)), {
    default: () => 0,
  }),
  afterRow: Schema.optional(Schema.Int.pipe(Schema.between(1, 2147483647))),
  aggregate: Schema.optional(
    Schema.Struct({
      operation: Schema.Literal("count", "count_distinct", "sum", "avg", "min", "max"),
      field: Schema.optional(Field),
    }),
  ),
}).pipe(
  Schema.filter((input) => (!input.afterRow && !input.offset) || Boolean(input.snapshotId), {
    message: () => "Pagination requires the returned snapshotId.",
  }),
);
export type DatasetQueryInput = typeof DatasetQueryInput.Type;

export interface SnapshotReference {
  id: string;
  datasetId: string;
  resourceKey: string;
  resourceUrl: string;
  sha256: string;
  fetchedAt: string;
  lastSeenAt: string;
  rowCount: number;
}

export interface SourceField {
  name: string;
  type: "text" | "number";
  unit?: string;
  role?: "period";
}

export interface DatasetEvidence {
  snapshot: SnapshotReference;
  query: DatasetQueryInput;
  fields: SourceField[];
  totalRows: number;
  rowsAreSample: boolean;
  rows: {
    rowNumber: number;
    data: Record<string, unknown>;
    selectedValues?: Record<string, unknown>;
  }[];
  aggregate?: {
    operation: string;
    field?: string;
    unit?: string;
    value: string | null;
    numericRows?: number;
    validRows?: number;
    status: "complete" | "missing_numeric_values" | "missing_values";
  };
}

const page = {
  snapshotId: Schema.optional(SnapshotId),
  limit: Schema.optional(Schema.Int.pipe(Schema.between(1, 100))),
  afterRow: Schema.optional(Schema.Int.pipe(Schema.between(1, 2147483647))),
};
const year = Schema.String.pipe(Schema.pattern(/^\d{4}$/));
const areaCode = Schema.String.pipe(Schema.pattern(/^\d{1,2}$/));

export const QueryDatasetInput = Schema.Union(
  Schema.Struct({
    ...page,
    datasetId: Schema.Literal("incasol"),
    resourceKey: Schema.Literal("qww9-bvhh"),
    filters: Schema.Struct({
      municipalityCode: Schema.String.pipe(Schema.pattern(/^\d{5}$/)),
      year,
      period: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(40)),
      priceBand: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(60)),
    }),
  }),
  Schema.Struct({
    ...page,
    datasetId: Schema.Literal("population"),
    aggregate: Schema.optional(Schema.Literal("sum_population")),
    resourceKey: Schema.UUID,
    filters: Schema.Struct({
      referenceDate: Schema.String.pipe(Schema.pattern(/^\d{4}-01-01$/)),
      districtCode: Schema.optional(areaCode),
      neighbourhoodCode: Schema.optional(areaCode),
      censusSection: Schema.optional(Schema.String.pipe(Schema.pattern(/^\d{1,10}$/))),
    }),
  }),
  Schema.Struct({
    ...page,
    datasetId: Schema.Literal("tourist-flats"),
    aggregate: Schema.optional(Schema.Literal("count_tourist_flats")),
    resourceKey: Schema.UUID,
    filters: Schema.Struct({
      districtCode: Schema.optional(areaCode),
      neighbourhoodCode: Schema.optional(areaCode),
    }),
  }),
  Schema.Struct({
    ...page,
    datasetId: Schema.Literal("ine-59061"),
    resourceKey: Schema.Literal("59061"),
    filters: Schema.Struct({
      seriesCode: Schema.String.pipe(Schema.pattern(/^[A-Z0-9]{1,32}$/)),
      year,
    }),
  }),
).pipe(
  Schema.filter((query) => query.afterRow === undefined || query.snapshotId !== undefined, {
    message: () => "Pagination requires a snapshot ID.",
  }),
  Schema.filter(
    (query) =>
      !("aggregate" in query && query.aggregate) ||
      (query.afterRow === undefined && query.limit === undefined),
    { message: () => "Aggregate queries cannot use pagination." },
  ),
);
export type QueryDatasetInput = typeof QueryDatasetInput.Type;
