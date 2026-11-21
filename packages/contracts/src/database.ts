import { Schema } from "effect";

export const SnapshotId = Schema.String.pipe(
  Schema.pattern(/^[1-9]\d{0,18}$/),
  Schema.filter((id) => id.length < 19 || id <= "9223372036854775807"),
);

export const QueryDatasetInput = Schema.Struct({
  datasetId: Schema.Literal("incasol"),
  resourceKey: Schema.Literal("qww9-bvhh"),
  snapshotId: Schema.optional(SnapshotId),
  filters: Schema.Struct({
    municipalityCode: Schema.String.pipe(Schema.pattern(/^\d{5}$/)),
    year: Schema.String.pipe(Schema.pattern(/^\d{4}$/)),
    period: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(40)),
    priceBand: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(60)),
  }),
  limit: Schema.optional(Schema.Int.pipe(Schema.between(1, 100))),
  afterRow: Schema.optional(Schema.Int.pipe(Schema.between(1, 2147483647))),
});
export type QueryDatasetInput = typeof QueryDatasetInput.Type;
