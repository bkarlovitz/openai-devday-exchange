import { beforeEach, expect, it, vi } from "vitest";
import { Effect } from "effect";
import { TranslateClaim } from "./translate-claim";
import type { TranslationParams } from "./translate-claim";
import { coordinator } from "../services/run-store";
import { translateExplanation } from "../services/explanation-language";

vi.mock("cloudflare:workers", () => ({
  WorkflowEntrypoint: class {
    constructor(
      public ctx: unknown,
      public env: unknown,
    ) {}
  },
}));
vi.mock("../services/run-store", () => ({ coordinator: vi.fn() }));
vi.mock("../services/explanation-language", () => ({ translateExplanation: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

const params: TranslationParams = {
  runId: "run-1",
  claimId: "claim-1",
  language: "es",
  languageRevision: 2,
  sourceArtifactKey: "runs/run-1/claims/claim-1/attempt-1/detail.json",
};
const sourceDetail = {
  claim: {
    claimId: "claim-1",
    quote: "Original quote",
    assertion: "Original assertion",
    start: 0,
    end: 14,
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
    explanation: "Original explanation",
    evidenceIds: [],
    uncertainty: [],
    calculations: [],
  },
};
function setup(accepted = true) {
  const owner = {
    beginTranslation: vi.fn(async () => accepted),
    publishTranslation: vi.fn(async () => true),
    failTranslation: vi.fn(async () => undefined),
  };
  vi.mocked(coordinator).mockReturnValue(owner as never);
  const bucket = {
    head: vi.fn(async () => null),
    get: vi.fn(async () => ({ json: async () => structuredClone(sourceDetail) })),
    put: vi.fn(async (_key: string, _body: string, _options: unknown) => undefined),
  };
  const workflow = new (TranslateClaim as unknown as new (
    ctx: unknown,
    env: unknown,
  ) => TranslateClaim)({}, { SUBMISSIONS: bucket });
  const step = { do: vi.fn(async (_name, _options, callback) => callback()) };
  vi.mocked(translateExplanation).mockReturnValue(
    Effect.succeed({ explanation: "Explicación traducida", uncertainty: [] }),
  );
  const run = () => workflow.run({ payload: params } as never, step as never);
  return { owner, bucket, step, run };
}

it("skips a stale or cached translation before accessing artifacts", async () => {
  const { owner, bucket, run } = setup(false);
  expect(await run()).toMatchObject({ status: "skipped" });
  expect(bucket.get).not.toHaveBeenCalled();
  expect(translateExplanation).not.toHaveBeenCalled();
  expect(owner.publishTranslation).not.toHaveBeenCalled();
});

it("reads the pinned source and publishes only a separate explanation artifact without retries", async () => {
  const { owner, bucket, step, run } = setup();
  expect(await run()).toMatchObject({ status: "complete" });
  expect(bucket.get).toHaveBeenCalledWith(params.sourceArtifactKey);
  const artifactKey = "runs/run-1/translations/claim-1/2/es.json";
  expect(JSON.parse(bucket.put.mock.calls[0][1] as string)).toEqual({
    explanation: "Explicación traducida",
    uncertainty: [],
  });
  expect(owner.publishTranslation).toHaveBeenCalledWith(
    2,
    "claim-1",
    "es",
    params.sourceArtifactKey,
    artifactKey,
  );
  expect(step.do.mock.calls.every((call) => call[1].retries.limit === 0)).toBe(true);
});

it("records a translation failure against the same source and revision", async () => {
  const { owner, run } = setup();
  vi.mocked(translateExplanation).mockReturnValue(Effect.fail(new Error("Model unavailable")));
  await expect(run()).rejects.toThrow("Model unavailable");
  expect(owner.failTranslation).toHaveBeenCalledWith(
    2,
    "claim-1",
    "es",
    params.sourceArtifactKey,
    expect.stringContaining("Model unavailable"),
  );
  expect(owner.publishTranslation).not.toHaveBeenCalled();
});
