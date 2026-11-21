import { expect, it } from "vitest";
import { chunkText } from "./chunk-text";

it("covers the complete original document with bounded overlap and exact Unicode offsets", () => {
  const text = "00:12 Ana: Barcelona té dades oficials. 😀\r\n".repeat(15) + "LAST PARAGRAPH";
  const chunks = chunkText(text, 90);
  const covered = new Set<number>();
  for (const chunk of chunks) {
    expect(chunk.text).toBe(text.slice(chunk.start, chunk.end));
    expect(chunk.text.length).toBeLessThanOrEqual(90);
    expect(chunk.text.charCodeAt(0)).not.toBeGreaterThanOrEqual(0xdc00);
    for (let i = chunk.start; i < chunk.end; i++) covered.add(i);
  }
  expect(covered.size).toBe(text.length);
  expect(chunks.at(-1)?.text.endsWith("LAST PARAGRAPH")).toBe(true);
  expect(chunks[1].start).toBeLessThan(chunks[0].end);
});

it("retains context and overlaps a claim cut by an unbroken transcript line", () => {
  const text =
    "background ".repeat(8) + "Barcelona has official population records." + " ending".repeat(15);
  const chunks = chunkText(text, 100);
  expect(
    chunks.some((chunk) => chunk.text.includes("Barcelona has official population records.")),
  ).toBe(true);
  expect(chunks[1].precedingContext).toBe(text.slice(0, chunks[1].start));
});
