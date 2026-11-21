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
    start = end;
  }
  return chunks;
}
