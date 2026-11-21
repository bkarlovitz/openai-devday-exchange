import { Schema } from "effect";

export const Evidence = Schema.Struct({
  evidenceId: Schema.String,
  kind: Schema.Literal("web", "dataset", "document"),
  sourceUrl: Schema.String,
  title: Schema.String,
  retrievedAt: Schema.String,
  sourceDate: Schema.optional(Schema.String),
  text: Schema.String,
  datasetId: Schema.optional(Schema.String),
  snapshotId: Schema.optional(Schema.String),
  resourceKey: Schema.optional(Schema.String),
  sha256: Schema.optional(Schema.String),
  rowNumbers: Schema.optional(Schema.Array(Schema.Number)),
  rows: Schema.optional(
    Schema.Array(
      Schema.Struct({
        rowNumber: Schema.Number,
        data: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
      }),
    ),
  ),
  query: Schema.optional(Schema.Unknown),
  totalRows: Schema.optional(Schema.Number),
  rowsAreSample: Schema.optional(Schema.Boolean),
  aggregate: Schema.optional(
    Schema.Struct({
      operation: Schema.String,
      field: Schema.optional(Schema.String),
      unit: Schema.optional(Schema.String),
      value: Schema.NullOr(Schema.String),
      numericRows: Schema.optional(Schema.Number),
      validRows: Schema.optional(Schema.Number),
      status: Schema.Literal("complete", "missing_numeric_values", "missing_values"),
    }),
  ),
  pageNumber: Schema.optional(Schema.Number),
  passageNumber: Schema.optional(Schema.Number),
  htmlLocation: Schema.optional(Schema.String),
  extractionVersion: Schema.optional(Schema.String),
});
export type Evidence = typeof Evidence.Type;

export const ResearchDecision = Schema.Struct({
  relevant: Schema.Boolean,
  sufficient: Schema.Boolean,
  conflicting: Schema.Boolean,
});
export type ResearchDecision = typeof ResearchDecision.Type;

export const ResearchResult = Schema.Struct({
  checkable: Schema.Boolean,
  topic: Schema.String,
  evidence: Schema.Array(Evidence),
  decision: ResearchDecision,
  notes: Schema.Array(Schema.String),
});
export type ResearchResult = typeof ResearchResult.Type;
