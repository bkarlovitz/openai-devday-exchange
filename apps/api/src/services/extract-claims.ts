import { Effect, JSONSchema, Schema } from "effect";
import { ExtractionResult } from "@council/contracts";
import type { Claim, Submission } from "@council/contracts";
import type { Env } from "../env";
import type { TextChunk } from "./chunk-text";
import { structuredResponse } from "./openai";

export function validateExtraction(
  result: unknown,
  chunk: TextChunk,
  submission: Submission,
  runId: string,
) {
  const extracted = Schema.decodeUnknownSync(ExtractionResult)(result);
  const claims: Claim[] = extracted.claims.map((claim, index) => {
    let localStart = -1;
    for (let occurrence = 0; occurrence <= claim.occurrence; occurrence++) {
      localStart = chunk.text.indexOf(claim.quote, localStart + 1);
      if (localStart < 0) break;
    }
    if (localStart < 0) {
      const unique = chunk.text.indexOf(claim.quote);
      if (unique < 0 || unique !== chunk.text.lastIndexOf(claim.quote)) {
        throw new Error(
          "An extracted quote did not match the submitted text. The chunk was not published.",
        );
      }
      localStart = unique;
    }
    const start = chunk.start + localStart;
    const end = start + claim.quote.length;
    const passage = submission.passages?.find((item) => item.start <= start && item.end >= end);
    const startPassage =
      passage ?? submission.passages?.find((item) => item.start <= start && item.end > start);
    return {
      claimId: `${runId}-${chunk.index}-${index}`,
      quote: claim.quote,
      assertion: claim.assertion,
      start,
      end,
      context: submission.text.slice(
        Math.max(0, start - 200),
        Math.min(submission.text.length, end + 200),
      ),
      entities: claim.entities,
      dates: claim.dates,
      metric: claim.metric,
      place: claim.place,
      comparison: claim.comparison,
      speaker: passage?.speaker,
      startSeconds: startPassage?.startSeconds,
      status: "awaiting_research",
    };
  });
  return { language: extracted.language, claims };
}

export function extractClaims(env: Env, chunk: TextChunk, submission: Submission, runId: string) {
  return structuredResponse(env, JSONSchema.make(ExtractionResult), {
    textToExtract: chunk.text,
    precedingContext: chunk.precedingContext,
    source: submission.source ?? null,
  }).pipe(Effect.map((result) => validateExtraction(result, chunk, submission, runId)));
}
