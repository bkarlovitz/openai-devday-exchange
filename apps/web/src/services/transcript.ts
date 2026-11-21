import type { Submission } from "@council/contracts";

type Passage = NonNullable<Submission["passages"]>[number];
const timestamp = "(?:\\d{1,3}:)?\\d{1,3}:\\d{2}(?:[.,]\\d{1,3})?";
const cueTiming = new RegExp(`^\\s*(${timestamp})\\s*-->\\s*${timestamp}(?:\\s.*)?$`);
const inlineTiming = new RegExp(`^\\s*\\[(${timestamp})\\]\\s*(.*)$`);

const standaloneTiming = new RegExp(`^\\s*(${timestamp})\\s*$`);

function seconds(value: string) {
  const parts = value.replace(",", ".").split(":").map(Number);
  const result = parts.reduce((sum, part) => sum * 60 + part, 0);
  return Number.isFinite(result) && parts.slice(1).every((part) => part < 60) ? result : undefined;
}

function speakerFrom(text: string) {
  const voice = text.match(/^\s*<v(?:\.[^\s>]*)?\s+([^>]+)>/);
  if (voice) return voice[1].trim();
  const label = text.match(/^\s*([^\n\r:<>]{1,60}):\s+\S/);
  return label && /\p{L}/u.test(label[1]) ? label[1].trim() : undefined;
}

/** Offsets always refer to the untouched input, including CRLF and Unicode. */
export function inferTranscriptPassages(text: string): readonly Passage[] {
  const lines = Array.from(text.matchAll(/[^\r\n]*(?:\r\n|\n|\r|$)/g))
    .filter((match) => match[0].length > 0)
    .map((match) => ({
      start: match.index!,
      raw: match[0],
      body: match[0].replace(/[\r\n]+$/, ""),
    }));
  const passages: Passage[] = [];
  for (let i = 0; i < lines.length; i++) {
    const timing = lines[i].body.match(cueTiming);
    if (timing) {
      const startSeconds = seconds(timing[1]);
      const first = lines[i + 1];
      if (!first || !first.body.trim() || startSeconds === undefined) continue;
      let last = i + 1;
      while (
        last + 1 < lines.length &&
        lines[last + 1].body.trim() &&
        !cueTiming.test(lines[last + 1].body)
      )
        last++;
      const start = first.start;
      const end = lines[last].start + lines[last].body.length;
      const speaker = speakerFrom(text.slice(start, end));
      passages.push({ start, end, startSeconds, ...(speaker ? { speaker } : {}) });
      i = last;
      continue;
    }
    const standalone = lines[i].body.match(standaloneTiming);
    if (standalone) {
      const startSeconds = seconds(standalone[1]);
      if (startSeconds === undefined) continue;
      let first = i + 1;
      while (first < lines.length && !lines[first].body.trim()) first++;
      if (
        first >= lines.length ||
        standaloneTiming.test(lines[first].body) ||
        cueTiming.test(lines[first].body) ||
        inlineTiming.test(lines[first].body)
      )
        continue;
      let last = first;
      while (
        last + 1 < lines.length &&
        !standaloneTiming.test(lines[last + 1].body) &&
        !cueTiming.test(lines[last + 1].body) &&
        !inlineTiming.test(lines[last + 1].body)
      )
        last++;
      while (last > first && !lines[last].body.trim()) last--;
      const start = lines[first].start;
      const end = lines[last].start + lines[last].body.length;
      const speaker = speakerFrom(text.slice(start, end));
      passages.push({ start, end, startSeconds, ...(speaker ? { speaker } : {}) });
      i = last;
      continue;
    }
    const inline = lines[i].body.match(inlineTiming);
    if (inline && inline[2].trim()) {
      const startSeconds = seconds(inline[1]);
      if (startSeconds === undefined) continue;
      const speaker = speakerFrom(inline[2]);
      passages.push({
        start: lines[i].start,
        end: lines[i].start + lines[i].body.length,
        startSeconds,
        ...(speaker ? { speaker } : {}),
      });
    }
  }
  return passages;
}
