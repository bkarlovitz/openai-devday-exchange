import { Schema } from "effect";
import { Language } from "./languages";

export const ExtractedAssertion = Schema.Struct({
  quote: Schema.String.pipe(Schema.minLength(1)),
  occurrence: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  assertion: Schema.String.pipe(Schema.minLength(1)),
  entities: Schema.Array(Schema.String),
  dates: Schema.Array(Schema.String),
  metric: Schema.NullOr(Schema.String),
  place: Schema.NullOr(Schema.String),
  comparison: Schema.NullOr(Schema.String),
});
export const ExtractionResult = Schema.Struct({
  language: Language,
  claims: Schema.Array(ExtractedAssertion),
});
export type ExtractionResult = typeof ExtractionResult.Type;

export const Claim = Schema.Struct({
  claimId: Schema.String,
  quote: Schema.String,
  assertion: Schema.String,
  start: Schema.Number,
  end: Schema.Number,
  context: Schema.String,
  entities: Schema.Array(Schema.String),
  dates: Schema.Array(Schema.String),
  metric: Schema.NullOr(Schema.String),
  place: Schema.NullOr(Schema.String),
  comparison: Schema.NullOr(Schema.String),
  speaker: Schema.optional(Schema.String),
  startSeconds: Schema.optional(Schema.Number),
  status: Schema.Literal("awaiting_research"),
});
export type Claim = typeof Claim.Type;

export const ExtractionProgress = Schema.Struct({
  attemptId: Schema.String,
  completedChunks: Schema.Number,
  totalChunks: Schema.Number,
  done: Schema.Boolean,
});
export type ExtractionProgress = typeof ExtractionProgress.Type;
