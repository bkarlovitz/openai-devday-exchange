import { Schema } from "effect";
import { Language } from "./languages";
import { Evidence, ResearchResult } from "./evidence";
import { Assessment, Verdict } from "./assessments";

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

export const ClaimOccurrence = Schema.Struct({
  start: Schema.Number,
  end: Schema.Number,
  speaker: Schema.optional(Schema.String),
  startSeconds: Schema.optional(Schema.Number),
});

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
  occurrences: Schema.optional(Schema.Array(ClaimOccurrence)),
  status: Schema.Literal(
    "awaiting_research",
    "researching",
    "assessing",
    "complete",
    "error",
    "not_checkable",
  ),
  verdict: Schema.optional(Verdict),
  evidenceCount: Schema.optional(Schema.Number),
  error: Schema.optional(Schema.String),
  explanationLanguage: Schema.optional(Language),
  translationStatus: Schema.optional(Schema.Literal("queued", "translating", "error")),
  translationError: Schema.optional(Schema.String),
});
export type Claim = typeof Claim.Type;

export const ExtractionProgress = Schema.Struct({
  attemptId: Schema.String,
  completedChunks: Schema.Number,
  totalChunks: Schema.Number,
  done: Schema.Boolean,
  warnings: Schema.optional(Schema.Array(Schema.String)),
});
export type ExtractionProgress = typeof ExtractionProgress.Type;

export const ClaimDetail = Schema.Struct({
  claim: Claim,
  evidence: Schema.Array(Evidence),
  assessment: Schema.optional(Assessment),
  research: Schema.optional(ResearchResult),
});
export type ClaimDetail = typeof ClaimDetail.Type;
