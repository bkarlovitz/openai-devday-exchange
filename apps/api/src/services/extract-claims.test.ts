import { describe, expect, it } from "vitest";
import { chunkText } from "./chunk-text";
import { validateExtraction } from "./extract-claims";

const base = {
  occurrence: 0,
  entities: [],
  dates: [],
  metric: null,
  place: null,
  comparison: null,
};
const runId = "e63639f3-c21c-4e6d-abe7-7e06e05aa87f";

describe("traceable extraction", () => {
  it("preserves two assertions sharing one compound quote", () => {
    const text = "The council approved the measure and opened the service.";
    const submission = { submissionKey: runId, text };
    const result = validateExtraction(
      {
        language: "en",
        claims: [
          { ...base, quote: text, assertion: "The council approved the measure." },
          { ...base, quote: text, assertion: "The council opened the service." },
        ],
      },
      chunkText(text)[0],
      submission,
      runId,
    );
    expect(result.claims).toHaveLength(2);
    expect(result.claims[0].claimId).not.toBe(result.claims[1].claimId);
    expect(result.claims.every((claim) => text.slice(claim.start, claim.end) === claim.quote)).toBe(
      true,
    );
  });

  it("anchors an embedded fact and supplied speaker context", () => {
    const text = "In my opinion this is great because the council opened a service.";
    const quote = "the council opened a service";
    const result = validateExtraction(
      { language: "en", claims: [{ ...base, quote, assertion: "The council opened a service." }] },
      chunkText(text)[0],
      {
        submissionKey: runId,
        text,
        passages: [{ start: 0, end: text.length, speaker: "Speaker", startSeconds: 30 }],
      },
      runId,
    );
    expect(result.claims[0].start).toBe(text.indexOf(quote));
    expect(result.claims[0].speaker).toBe("Speaker");
    expect(result.claims[0].startSeconds).toBe(30);
  });

  it("handles missing metadata, rejects invented quotes, and accepts an empty result", () => {
    const text = "El Consell va aprovar la mesura.";
    const submission = { submissionKey: runId, text };
    const chunk = chunkText(text)[0];
    const valid = { ...base, quote: text, assertion: text };
    expect(
      validateExtraction({ language: "ca", claims: [valid] }, chunk, submission, runId).claims[0]
        .speaker,
    ).toBeUndefined();
    expect(() =>
      validateExtraction(
        { language: "ca", claims: [{ ...valid, quote: "invented quote" }] },
        chunk,
        submission,
        runId,
      ),
    ).toThrow("did not match");
    expect(
      validateExtraction({ language: "ca", claims: [] }, chunk, submission, runId).claims,
    ).toEqual([]);
    expect(() =>
      validateExtraction({ language: "ca", claims: [{}] }, chunk, submission, runId),
    ).toThrow();
  });

  it("anchors a unique exact quote when the model miscounts its occurrence", () => {
    const text = "The council opened a service.";
    const result = validateExtraction(
      { language: "en", claims: [{ ...base, occurrence: 1, quote: text, assertion: text }] },
      chunkText(text)[0],
      { submissionKey: runId, text },
      runId,
    );
    expect(result.claims[0].start).toBe(0);
    expect(result.claims[0].quote).toBe(text);
  });

  it("covers a multi-chunk Unicode input and maps quotes to global offsets", () => {
    const text = "😀 Barcelona. ".repeat(1500) + "El alquiler subió.";
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.text).join("")).toBe(text);
    for (const chunk of chunks) {
      expect(chunk.text).toBe(text.slice(chunk.start, chunk.end));
      expect(chunk.text).not.toMatch(/[\uD800-\uDFFF]/u);
    }
    const chunk = chunks.at(-1)!;
    const result = validateExtraction(
      {
        language: "es",
        claims: [{ ...base, quote: "El alquiler subió.", assertion: "El alquiler subió." }],
      },
      chunk,
      { submissionKey: runId, text },
      runId,
    );
    expect(result.claims[0].start).toBe(text.indexOf("El alquiler subió."));
  });
});
