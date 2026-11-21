export interface TextChunk {
  index: number;
  start: number;
  end: number;
  text: string;
  precedingContext: string;
}

export function chunkText(text: string, maxLength = 8000): TextChunk[] {
  if (maxLength < 2) throw new Error("Chunk length must be at least two UTF-16 units.");
  const chunks: TextChunk[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxLength, text.length);
    if (end < text.length) {
      const window = text.slice(start, end);
      const boundary = Math.max(
        window.lastIndexOf("\n"),
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? "),
      );
      if (boundary > maxLength / 2) end = start + boundary + 1;
      const before = text.charCodeAt(end - 1);
      const after = text.charCodeAt(end);
      if (before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff) end--;
    }
    chunks.push({
      index: chunks.length,
      start,
      end,
      text: text.slice(start, end),
      precedingContext: text.slice(Math.max(0, start - 500), start),
    });
    if (end === text.length) break;
    // Repeat a small amount of original text so a boundary cannot hide an
    // assertion. Publication links exact duplicate occurrences conservatively.
    const overlap = Math.min(500, Math.floor(maxLength / 4));
    let next = Math.max(start + 1, end - overlap);
    const repeated = text.slice(next, end);
    const boundary = repeated.search(/\n|[.!?] /);
    if (boundary >= 0) next += boundary + 1;
    const before = text.charCodeAt(next - 1);
    const after = text.charCodeAt(next);
    if (before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff) next++;
    start = Math.min(next, end);
  }
  return chunks;
}
