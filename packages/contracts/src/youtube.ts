import { Schema } from "effect";
import { Language } from "./languages";

const seconds = Schema.Int.pipe(Schema.between(0, 86400));

export const YoutubeSubmission = Schema.Struct({
  url: Schema.String.pipe(Schema.maxLength(2048)),
  fromSeconds: seconds,
  toSeconds: seconds,
  submissionKey: Schema.UUID,
  explanationLanguage: Schema.optional(Language),
}).pipe(
  Schema.filter(
    (input) => input.toSeconds > input.fromSeconds && input.toSeconds - input.fromSeconds <= 180,
    { message: () => "Select an interval of at most 180 seconds." },
  ),
);

export type YoutubeSubmission = typeof YoutubeSubmission.Type;

export function youtubeVideoId(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return;
    let id: string | null | undefined;
    if (url.hostname === "youtu.be") {
      id = /^\/([\w-]{11})\/?$/.exec(url.pathname)?.[1];
    } else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      id = url.pathname === "/watch" ? url.searchParams.get("v") : undefined;
    }
    if (id?.length === 11 && /^[\w-]{11}$/.test(id)) return id;
  } catch {
    return undefined;
  }
}
