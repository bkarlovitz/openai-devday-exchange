import { Schema } from "effect";

export const SnapshotId = Schema.String.pipe(
  Schema.pattern(/^[1-9]\d{0,18}$/),
  Schema.filter((id) => id.length < 19 || id <= "9223372036854775807"),
);

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
