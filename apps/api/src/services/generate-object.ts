import { Effect, Schema } from "effect";
import type { Env } from "../env";

const Envelope = Schema.Struct({
  status: Schema.String,
  output: Schema.Array(
    Schema.Struct({
      type: Schema.String,
      content: Schema.optional(
        Schema.Array(
          Schema.Struct({
            type: Schema.String,
            text: Schema.optional(Schema.String),
          }),
        ),
      ),
    }),
  ),
});

export function generateObject(
  env: Env,
  options: {
    schema: unknown;
    name: string;
    input: unknown;
    instructions: string;
    model?: string;
    timeoutMs?: number;
  },
) {
  return Effect.tryPromise({
    try: async () => {
      if (!env.OPENAI_API_KEY) throw new Error("Configure OPENAI_API_KEY to run checking.");
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
        body: JSON.stringify({
          model: options.model ?? env.RESEARCH_MODEL ?? "gpt-5.4-mini",
          store: false,
          reasoning: { effort: "low" },
          instructions: options.instructions,
          input: JSON.stringify(options.input),
          max_output_tokens: 5000,
          text: {
            format: {
              type: "json_schema",
              name: options.name,
              strict: true,
              schema: options.schema,
            },
          },
        }),
      });
      if (!response.ok) throw new Error(`OpenAI ${options.name} failed (HTTP ${response.status}).`);
      const envelope = Schema.decodeUnknownSync(Envelope)(await response.json());
      if (envelope.status !== "completed")
        throw new Error(`OpenAI ${options.name} was incomplete.`);
      const text = envelope.output
        .flatMap((item) => item.content ?? [])
        .filter((part) => part.type === "output_text")
        .map((part) => part.text ?? "")
        .join("");
      if (!text) throw new Error(`OpenAI ${options.name} returned no usable content.`);
      return JSON.parse(text) as unknown;
    },
    catch: (cause) => (cause instanceof Error ? cause : new Error("Model request failed.")),
  });
}
