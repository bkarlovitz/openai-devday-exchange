import { describe, expect, it } from "vitest";
import { inferTranscriptPassages } from "./transcript";

describe("transcript metadata without rewriting input", () => {
  it("retains CRLF, emoji and exact SRT body offsets", () => {
    const text =
      "1\r\n00:01:02,500 --> 00:01:05,000\r\nAna: Barcelona 😀 grew.\r\nSecond line.\r\n\r\n2\r\n00:02:00,000 --> 00:02:01,000\r\nOther claim.\r\n";
    const passages = inferTranscriptPassages(text);
    expect(passages).toHaveLength(2);
    expect(passages[0]).toMatchObject({ speaker: "Ana", startSeconds: 62.5 });
    expect(text.slice(passages[0].start, passages[0].end)).toBe(
      "Ana: Barcelona 😀 grew.\r\nSecond line.",
    );
    expect(text.slice(passages[1].start, passages[1].end)).toBe("Other claim.");
  });
  it("reads WebVTT voice and optional hours plus bracketed transcript timestamps", () => {
    const text =
      "WEBVTT\n\n00:03.200 --> 00:05.000 align:start\n<v Maria>Claim here.\n\n[01:02:03] Joan: Another claim.";
    expect(inferTranscriptPassages(text)).toEqual([
      {
        start: text.indexOf("<v"),
        end: text.indexOf("\n\n["),
        speaker: "Maria",
        startSeconds: 3.2,
      },
      { start: text.indexOf("["), end: text.length, speaker: "Joan", startSeconds: 3723 },
    ]);
  });
  it("recognizes copied YouTube m:ss, mm:ss and h:mm:ss blocks without altering offsets", () => {
    const text =
      "0:00\r\nAna: First 😀 claim.\r\nContinued.\r\n\r\n12:34\r\nSecond claim.\r\n1:02:03\r\nThird claim.\r\n125:04\r\nFourth claim.\r\n0:99\r\nInvalid timestamp.";
    const passages = inferTranscriptPassages(text);
    expect(passages.map((passage) => passage.startSeconds)).toEqual([0, 754, 3723, 7504]);
    expect(passages[0].speaker).toBe("Ana");
    expect(passages.map((passage) => text.slice(passage.start, passage.end))).toEqual([
      "Ana: First 😀 claim.\r\nContinued.",
      "Second claim.",
      "Third claim.",
      "Fourth claim.",
    ]);
  });
  it("does not invent speakers or timestamps for ordinary text or invalid times", () => {
    expect(inferTranscriptPassages("Population grew.\n[00:99] Invalid.\nNo timestamps.")).toEqual(
      [],
    );
  });
});
