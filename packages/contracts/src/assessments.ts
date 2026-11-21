import { Schema } from "effect";

export const Verdict = Schema.Literal(
  "supported",
  "contradicted",
  "mixed_evidence",
  "insufficient_evidence",
);
export type Verdict = typeof Verdict.Type;

export const Calculation = Schema.Struct({
  operation: Schema.Literal("difference", "percentage_change", "sum"),
  operands: Schema.Array(
    Schema.Struct({
      label: Schema.String,
      value: Schema.Number.pipe(Schema.finite()),
      unit: Schema.String,
      evidenceId: Schema.String,
    }),
  ),
  formula: Schema.String,
  result: Schema.Number.pipe(Schema.finite()),
  unit: Schema.String,
});
export type Calculation = typeof Calculation.Type;

export const Assessment = Schema.Struct({
  verdict: Verdict,
  explanation: Schema.String,
  evidenceIds: Schema.Array(Schema.String),
  uncertainty: Schema.Array(Schema.String),
  calculations: Schema.Array(Calculation),
});
export type Assessment = typeof Assessment.Type;
