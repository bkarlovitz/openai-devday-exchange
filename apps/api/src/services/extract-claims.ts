import { Effect, JSONSchema, Schema } from "effect";
import { ExtractionResult } from "@council/contracts";
import type { Claim, Submission } from "@council/contracts";
import type { Env } from "../env";
import type { TextChunk } from "./chunk-text";
import { structuredResponse } from "./openai";

function normalizedText(text: string) {
  let value = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;
  for (const original of text) {
    const end = offset + original.length;
    const normalized = original.normalize("NFKC").replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
    for (const character of normalized) {
      const token = /\s/u.test(character) ? " " : character;
      if (token === " " && value.endsWith(" ")) {
        ends[ends.length - 1] = end;
        continue;
      }
      value += token;
      for (let i = 0; i < token.length; i++) {
        starts.push(offset);
        ends.push(end);
      }
    }
    offset = end;
  }
  return { value, starts, ends };
}

/** Only mechanical typography/whitespace repair; publish the original source span. */
export function normalizedQuoteSpan(
  text: string,
  quote: string,
): { start: number; end: number } | undefined {
  const source = normalizedText(text);
  const target = normalizedText(quote).value.trim();
  if (!target) return;
  const index = source.value.indexOf(target);
  if (index < 0 || index !== source.value.lastIndexOf(target)) return;
  const start = source.starts[index];
  const end = source.ends[index + target.length - 1];
  if (normalizedText(text.slice(start, end)).value.trim() !== target) return;
  return { start, end };
}

export function validateExtraction(
  result: unknown,
  chunk: TextChunk,
  submission: Submission,
  runId: string,
  allowPartial = false,
) {
  const extracted = Schema.decodeUnknownSync(ExtractionResult)(result);
  let rejected = 0;
  const claims: Claim[] = extracted.claims.flatMap((claim, index) => {
    let localStart = -1;
    for (let occurrence = 0; occurrence <= claim.occurrence; occurrence++) {
      localStart = chunk.text.indexOf(claim.quote, localStart + 1);
      if (localStart < 0) break;
    }
    let localEnd = localStart + claim.quote.length;
    if (localStart < 0) {
      const unique = chunk.text.indexOf(claim.quote);
      if (unique < 0 || unique !== chunk.text.lastIndexOf(claim.quote)) {
        const normalized = normalizedQuoteSpan(chunk.text, claim.quote);
        if (!normalized) {
          if (!allowPartial)
            throw new Error(
              "An extracted quote did not match the submitted text. The chunk was not published.",
            );
          rejected++;
          return [];
        }
        localStart = normalized.start;
        localEnd = normalized.end;
      } else {
        localStart = unique;
        localEnd = unique + claim.quote.length;
      }
    }
    const start = chunk.start + localStart;
    const end = chunk.start + localEnd;
    const passage = submission.passages?.find((item) => item.start <= start && item.end >= end);
    return [
      {
        claimId: `${runId}-${chunk.index}-${index}`,
        quote: submission.text.slice(start, end),
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
        startSeconds: passage?.startSeconds,
        occurrences: [
          { start, end, speaker: passage?.speaker, startSeconds: passage?.startSeconds },
        ],
        status: "awaiting_research" as const,
      },
    ];
  });
  return {
    language: extracted.language,
    claims,
    warnings: rejected
      ? [
          `${rejected} candidate claim${rejected === 1 ? "" : "s"} could not be linked exactly to the source text and were excluded. Review the original passage for coverage.`,
        ]
      : [],
  };
}

export function extractClaims(env: Env, chunk: TextChunk, submission: Submission, runId: string) {
  return structuredResponse(env, JSONSchema.make(ExtractionResult), {
    textToExtract: chunk.text,
    precedingContext: chunk.precedingContext,
    source: submission.source ?? null,
  }).pipe(Effect.map((result) => validateExtraction(result, chunk, submission, runId, true)));
}
