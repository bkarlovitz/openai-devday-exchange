import { afterEach, expect, it, vi } from "vitest";
import { Effect } from "effect";
import type { Claim } from "@council/contracts";
import { classifyPassage, routeClaim } from "./decisions";

afterEach(() => vi.unstubAllGlobals());

it.each(["factual_assertion", "opinion_prediction", "uncertain"] as const)(
  "returns an advisory %s classification without a truth verdict",
  async (kind) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ answers: [{ type: "choice", name: "passage_kind", choice: kind }] }),
      ),
    );
    const result = await Effect.runPromise(
      classifyPassage({ OPENAI_API_KEY: "test" } as never, "A sentence to classify."),
    );
    expect(result.kind).toBe(kind);
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result).not.toHaveProperty("checkable");
  },
);

it("keeps an unrecognized passage answer uncertain", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ answers: [] })),
  );
  const result = await Effect.runPromise(
    classifyPassage({ OPENAI_API_KEY: "test" } as never, "An incomplete phrase"),
  );
  expect(result.kind).toBe("uncertain");
});

const claim: Claim = {
  claimId: "claim",
  quote: "The council approved a measure.",
  assertion: "The council approved a measure.",
  start: 0,
  end: 31,
  context: "",
  entities: [],
  dates: [],
  metric: null,
  place: null,
  comparison: null,
  status: "awaiting_research",
};

it("keeps uncertain classifications in the research path", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        answers: [
          { type: "choice", name: "checkable", choice: "uncertain" },
          { type: "choice", name: "topic", choice: "general" },
          { type: "choice", name: "dataset", choice: "web" },
        ],
      }),
    ),
  );
  const result = await Effect.runPromise(routeClaim({ OPENAI_API_KEY: "test" } as never, claim));
  expect(result).toEqual({ checkable: true, topic: "general", dataset: "web" });
});

it("reports a provider failure as a technical error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("", { status: 503 })),
  );
  const result = await Effect.runPromise(
    routeClaim({ OPENAI_API_KEY: "test" } as never, claim).pipe(Effect.either),
  );
  expect(result._tag).toBe("Left");
  if (result._tag === "Left") expect(result.left.message).toContain("HTTP 503");
});
