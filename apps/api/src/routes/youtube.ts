import { Effect, Schema } from "effect";
import {
  normalizeSubmission,
  Submission,
  YoutubeSubmission,
  youtubeVideoId,
} from "@council/contracts";
import type { Context } from "hono";
import type { Env } from "../env";
import { createRun } from "../services/run-store";

const PreparedImport = Schema.Struct({ identity: Schema.String, submission: Submission });

export async function submitYoutube(c: Context<{ Bindings: Env }>) {
  const input = Schema.decodeUnknownEither(YoutubeSubmission, { onExcessProperty: "error" })(
    await c.req.json().catch(() => null),
  );
  if (input._tag === "Left") return c.json({ error: input.left.message }, 400);
  const { url, fromSeconds, toSeconds, explanationLanguage } = input.right;
  const videoId = youtubeVideoId(url);
  if (!videoId) return c.json({ error: "Provide a YouTube video URL." }, 400);
  const submissionKey = input.right.submissionKey.toLowerCase();
  const cacheKey = `youtube-imports/${submissionKey}.json`;
  const identity = JSON.stringify([videoId, fromSeconds, toSeconds, explanationLanguage]);
  const conflict = () =>
    c.json({ error: "This submission key was already used for a different video request." }, 409);

  let cached = await c.env.SUBMISSIONS.get(cacheKey);
  if (!cached) {
    const { YOUTUBE_IMPORTER, YOUTUBE_IMPORT_URL, YOUTUBE_IMPORT_TOKEN } = c.env;
    if ((!YOUTUBE_IMPORTER && !YOUTUBE_IMPORT_URL) || !YOUTUBE_IMPORT_TOKEN) {
      return c.json({ error: "YouTube import is not configured." }, 503);
    }

    let response: Response;
    try {
      const request = new Request(
        YOUTUBE_IMPORTER ? "http://container/youtube" : YOUTUBE_IMPORT_URL!,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${YOUTUBE_IMPORT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ videoId, fromSeconds, toSeconds }),
          signal: AbortSignal.timeout(YOUTUBE_IMPORTER ? 45_000 : 30_000),
          redirect: "manual",
        },
      );
      response = YOUTUBE_IMPORTER
        ? await YOUTUBE_IMPORTER.getByName("youtube-importer").fetch(request)
        : await fetch(request);
    } catch {
      return c.json({ error: "The YouTube importer is unavailable or timed out." }, 503);
    }
    if (response.status === 422) {
      return c.json({ error: "No usable subtitles were available in that interval." }, 422);
    }
    if (!response.ok)
      return c.json({ error: "The YouTube importer could not retrieve subtitles." }, 503);
    const transcript = await response
      .json<{ text?: unknown; passages?: unknown; title?: unknown }>()
      .catch(() => null);
    const decoded = Schema.decodeUnknownEither(Submission)({
      submissionKey,
      explanationLanguage,
      text: transcript?.text,
      passages: transcript?.passages,
      source: {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: transcript?.title,
      },
    });
    if (decoded._tag === "Left")
      return c.json({ error: "The importer returned invalid subtitles." }, 503);
    const written = await c.env.SUBMISSIONS.put(
      cacheKey,
      JSON.stringify({ identity, submission: normalizeSubmission(decoded.right) }),
      { onlyIf: { etagDoesNotMatch: "*" } },
    );
    if (!written) cached = await c.env.SUBMISSIONS.get(cacheKey);
    else return finish(decoded.right);
  }
  if (!cached)
    return c.json({ error: "Could not load the prepared transcript. Please retry." }, 503);
  const prepared = Schema.decodeUnknownSync(PreparedImport)(await cached.json());
  if (prepared.identity !== identity) return conflict();
  return finish(prepared.submission);

  async function finish(submission: typeof Submission.Type) {
    const result = await Effect.runPromise(createRun(c.env, normalizeSubmission(submission)));
    if (result.conflict) return conflict();
    return c.json({ runId: result.run.runId, url: `/runs/${result.run.runId}` }, 202);
  }
}
