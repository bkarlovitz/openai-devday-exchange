import { Effect } from "effect";
import type { SearchSource } from "./search";

function decodeEntities(text: string) {
  return text.replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[0-9a-f]+|[0-9]+);/gi, (entity) => {
    const named: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
      "&nbsp;": " ",
    };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const code =
      entity[2].toLowerCase() === "x"
        ? Number.parseInt(entity.slice(3, -1), 16)
        : Number.parseInt(entity.slice(2, -1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

export function visibleText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function verifyExcerpt(sourceText: string, quote: string) {
  const normalized = quote.replace(/\s+/g, " ").trim();
  if (!normalized || !sourceText.replace(/\s+/g, " ").includes(normalized)) {
    throw new Error("The quoted passage was not found in retained source text.");
  }
  return normalized;
}

export function readSource(source: SearchSource) {
  return Effect.tryPromise({
    try: async () => {
      const url = new URL(source.url);
      if (!["https:", "http:"].includes(url.protocol))
        throw new Error("Source URL must use HTTP or HTTPS.");
      const response = await fetch(source.url, {
        signal: AbortSignal.timeout(15_000),
        headers: { "User-Agent": "Wingman/0.1" },
      });
      if (!response.ok) throw new Error(`Source retrieval failed (HTTP ${response.status}).`);
      const contentType = response.headers.get("content-type") ?? "";
      if (!/text\/|json|xml/i.test(contentType)) {
        return {
          ...source,
          url: response.url || source.url,
          text: "",
          retrievedAt: new Date().toISOString(),
          unavailable: "This source needs a document extractor.",
        };
      }
      const body = await response.text();
      const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const text = /html|xml/i.test(contentType)
        ? visibleText(body)
        : body.replace(/\s+/g, " ").trim();
      return {
        url: response.url || source.url,
        title: titleMatch ? visibleText(titleMatch[1]) : source.title,
        text: text.slice(0, 100_000),
        retrievedAt: new Date().toISOString(),
        unavailable: text ? undefined : "No readable text was returned by this source.",
      };
    },
    catch: (cause) => (cause instanceof Error ? cause : new Error("Source retrieval failed.")),
  });
}
