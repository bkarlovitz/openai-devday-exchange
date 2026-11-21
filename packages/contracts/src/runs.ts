import { Schema } from "effect";
import { Language } from "./languages";
import { Claim, ExtractionProgress } from "./claims";
export { Language } from "./languages";

export const MAX_TEXT_CHARACTERS = 200_000;

export const SubmissionText = Schema.String.pipe(
  Schema.filter(
    (text) => text.trim().length > 0 && Array.from(text).length <= MAX_TEXT_CHARACTERS,
    { message: () => "Enter text containing 1 to 200,000 characters." },
  ),
);

export const Source = Schema.Struct({
  url: Schema.optional(
    Schema.String.pipe(
      Schema.filter(
        (value) => {
          try {
            return ["https:", "http:"].includes(new URL(value).protocol);
          } catch {
            return false;
          }
        },
        { message: () => "Source URL must be an HTTP or HTTPS URL." },
      ),
    ),
  ),
  title: Schema.optional(Schema.String),
  sessionDate: Schema.optional(Schema.String),
});

export const Passage = Schema.Struct({
  start: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  end: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  speaker: Schema.optional(Schema.String),
  startSeconds: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
});

export const Submission = Schema.Struct({
  submissionKey: Schema.UUID,
  text: SubmissionText,
  source: Schema.optional(Source),
  passages: Schema.optional(Schema.Array(Passage)),
  explanationLanguage: Schema.optional(Language),
}).pipe(
  Schema.filter(
    (submission) =>
      submission.passages?.every(
        (passage) => passage.start < passage.end && passage.end <= submission.text.length,
      ) ?? true,
    { message: () => "Passage offsets must refer to the submitted text." },
  ),
);

export type Submission = typeof Submission.Type;

export const Run = Schema.Struct({
  runId: Schema.UUID,
  submission: Submission,
  status: Schema.Literal(
    "queued",
    "awaiting_processing",
    "extracting",
    "processing",
    "complete",
    "error",
  ),
  claims: Schema.optionalWith(Schema.Array(Claim), { default: () => [] }),
  extraction: Schema.optional(ExtractionProgress),
  detectedLanguage: Schema.optional(Language),
  explanationLanguage: Schema.optional(Language),
  error: Schema.optional(Schema.String),
  errorCount: Schema.optionalWith(Schema.Number, { default: () => 0 }),
  createdAt: Schema.String,
  revision: Schema.Number,
});
export type Run = typeof Run.Type;

export const SubmissionReceipt = Schema.Struct({
  runId: Schema.UUID,
  url: Schema.String,
});
export type SubmissionReceipt = typeof SubmissionReceipt.Type;

export const ApiError = Schema.Struct({
  error: Schema.String,
});

export function normalizeSubmission(input: Submission): Submission {
  return {
    submissionKey: input.submissionKey.toLowerCase(),
    text: input.text,
    source: input.source && {
      url: input.source.url,
      title: input.source.title,
      sessionDate: input.source.sessionDate,
    },
    passages: input.passages?.map((passage) => ({
      start: passage.start,
      end: passage.end,
      speaker: passage.speaker,
      startSeconds: passage.startSeconds,
    })),
    explanationLanguage: input.explanationLanguage,
  };
}
