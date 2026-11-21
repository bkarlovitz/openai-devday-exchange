import { beforeEach, expect, it, vi } from "vitest";
import { Effect } from "effect";
import type { ClaimDetail } from "@council/contracts";
import type { Env } from "../env";
import { translateExplanation } from "./explanation-language";
import { generateObject } from "./generate-object";

vi.mock("./generate-object", () => ({ generateObject: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

const detail: ClaimDetail = {
  claim: {
    claimId: "claim-1",
    quote: "La renda va pujar un 0,47%.",
    assertion: "La renda va pujar un 0,47%.",
    start: 0,
    end: 29,
    context: "",
    entities: [],
    dates: [],
    metric: null,
    place: null,
    comparison: null,
    status: "complete",
    verdict: "supported",
  },
  evidence: [],
  assessment: {
    verdict: "supported",
    explanation: "Rent rose 0.47%.",
    evidenceIds: ["source-1"],
    uncertainty: ["Coverage is limited to registered rents."],
    calculations: [
      {
        operation: "percentage_change",
        operands: [
          { label: "2025", value: 1135.55, unit: "EUR/month", evidenceId: "source-1" },
          { label: "2026", value: 1140.89, unit: "EUR/month", evidenceId: "source-1" },
        ],
        formula: "(1140.89 - 1135.55) / 1135.55 * 100",
        result: 0.4702567038,
        unit: "%",
      },
    ],
  },
};

it.each(["en", "es", "ca"] as const)(
  "requests %s explanatory text without changing retained facts",
  async (language) => {
    const before = structuredClone(detail);
    const translated = {
      explanation: "Translated explanation",
      uncertainty: ["Translated caveat"],
    };
    vi.mocked(generateObject).mockReturnValue(Effect.succeed(translated));
    expect(await Effect.runPromise(translateExplanation({} as Env, detail, language))).toEqual(
      translated,
    );
    expect(detail).toEqual(before);
    const options = vi.mocked(generateObject).mock.calls[0][1];
    expect(options.timeoutMs).toBe(30_000);
    expect(options.input).toMatchObject({
      targetLanguage: language,
      verdict: "supported",
      calculations: detail.assessment!.calculations,
    });
  },
);

it("rejects translations that remove uncertainty", async () => {
  vi.mocked(generateObject).mockReturnValue(
    Effect.succeed({ explanation: "Translated", uncertainty: [] }),
  );
  const result = await Effect.runPromise(
    translateExplanation({} as Env, detail, "es").pipe(Effect.either),
  );
  expect(result._tag).toBe("Left");
});

it("rejects additional fields rather than accepting a rewritten verdict", async () => {
  vi.mocked(generateObject).mockReturnValue(
    Effect.succeed({ explanation: "Translated", uncertainty: ["Caveat"], verdict: "contradicted" }),
  );
  const result = await Effect.runPromise(
    translateExplanation({} as Env, detail, "ca").pipe(Effect.either),
  );
  expect(result._tag).toBe("Left");
});

it("fails without making a model request when no assessment is retained", async () => {
  const result = await Effect.runPromise(
    translateExplanation({} as Env, { ...detail, assessment: undefined }, "en").pipe(Effect.either),
  );
  expect(result._tag).toBe("Left");
  expect(generateObject).not.toHaveBeenCalled();
});
