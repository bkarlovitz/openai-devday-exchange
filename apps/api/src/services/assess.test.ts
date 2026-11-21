import { describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import type { Assessment, Claim, Evidence } from "@council/contracts";
import { calculate } from "../research/calculate";
import { assessClaim, validateAssessment } from "./assess";
import { generateObject } from "./generate-object";
import type { Env } from "../env";
const env = {} as Env;

vi.mock("./generate-object", () => ({ generateObject: vi.fn() }));

const source: Evidence = {
  evidenceId: "rents",
  kind: "dataset",
  sourceUrl: "https://example.org/rents",
  title: "Official rent observations",
  retrievedAt: "2026-11-21T12:00:00Z",
  text: "2025 rent 1135.55 EUR/month; 2026 rent 1140.89 EUR/month.",
  datasetId: "incasol",
  rows: [
    { rowNumber: 1, data: { Any: "2025", Renda: "1135.55" } },
    { rowNumber: 2, data: { Any: "2026", Renda: "1140.89" } },
  ],
};
const claim: Claim = {
  claimId: "claim-1",
  quote: "Rent rose 0.47% from 2025 to 2026.",
  assertion: "Rent rose 0.47% from 2025 to 2026.",
  start: 0,
  end: 39,
  context: "",
  entities: [],
  dates: ["2025", "2026"],
  metric: "rent",
  place: "Barcelona",
  comparison: "2025 to 2026",
  status: "assessing",
};
const sufficient = { relevant: true, sufficient: true, conflicting: false };
const proposal = (verdict: Assessment["verdict"]): Assessment => ({
  verdict,
  explanation: "The cited source addresses the assertion.",
  evidenceIds: ["rents"],
  uncertainty: [],
  calculations: [],
});
const operands = [
  { label: "2025", value: 1135.55, unit: "EUR/month", evidenceId: "rents" },
  { label: "2026", value: 1140.89, unit: "EUR/month", evidenceId: "rents" },
];

describe("assessment evidence guards", () => {
  it.each(["supported", "contradicted", "mixed_evidence", "insufficient_evidence"] as const)(
    "retains a valid %s fixture",
    (verdict) => {
      expect(validateAssessment(proposal(verdict), [source], sufficient).verdict).toBe(verdict);
    },
  );
  it("rejects unknown citations", () => {
    expect(() =>
      validateAssessment({ ...proposal("supported"), evidenceIds: ["invented"] }, [source]),
    ).toThrow("unknown evidence");
  });
  it("lets retained evidence override mistaken fast-decision flags", async () => {
    vi.mocked(generateObject).mockReturnValueOnce(Effect.succeed(proposal("supported")));
    const result = await Effect.runPromise(
      assessClaim(env, claim, [source], "en", {
        relevant: false,
        sufficient: false,
        conflicting: false,
      }),
    );
    expect(result.verdict).toBe("supported");
    expect(generateObject).toHaveBeenCalled();
  });
  it("returns insufficient evidence for missing periods without asking a model", async () => {
    const result = await Effect.runPromise(
      assessClaim(
        env,
        claim,
        [{ ...source, rows: [{ rowNumber: 1, data: { Any: "2024", Renda: "1100" } }] }],
        "en",
        sufficient,
      ),
    );
    expect(result.verdict).toBe("insufficient_evidence");
  });
  it("keeps an approval-versus-delivery fixture unresolved", async () => {
    vi.mocked(generateObject).mockReturnValueOnce(
      Effect.succeed({
        ...proposal("insufficient_evidence"),
        explanation: "Approval of construction does not establish that the service opened.",
      }),
    );
    const result = await Effect.runPromise(
      assessClaim(env, { ...claim, assertion: "The service opened.", dates: [] }, [source], "en", {
        relevant: true,
        sufficient: false,
        conflicting: false,
      }),
    );
    expect(result.verdict).toBe("insufficient_evidence");
    expect(result.explanation).toContain("Approval");
  });
});

describe("reproducible arithmetic", () => {
  it("rejects numbers from dataset query metadata when no source rows exist", () => {
    expect(() =>
      calculate({ operation: "sum", operands: [operands[0]] }, [
        {
          ...source,
          rows: [],
          text: JSON.stringify({ query: { value: 1135.55 }, totalRows: 0 }),
        },
      ]),
    ).toThrow("not present");
  });
  it("regenerates the explanation when model arithmetic disagrees with code", async () => {
    const computation = calculate({ operation: "percentage_change", operands }, [source]);
    vi.mocked(generateObject)
      .mockReturnValueOnce(
        Effect.succeed({
          ...proposal("supported"),
          explanation: "Rent rose 42%.",
          calculations: [{ ...computation, result: 42 }],
        }),
      )
      .mockReturnValueOnce(
        Effect.succeed({
          ...proposal("supported"),
          explanation: "Rent rose approximately 0.47%.",
          calculations: [computation],
        }),
      );
    const result = await Effect.runPromise(assessClaim(env, claim, [source], "en", sufficient));
    expect(result.explanation).toContain("0.47%");
    expect(result.calculations[0].result).toBe(computation.result);
  });

  it("computes percentage change from cited values", () => {
    const result = calculate({ operation: "percentage_change", operands }, [source]);
    expect(result.result).toBeCloseTo(0.4702567, 5);
    expect(result.unit).toBe("%");
  });
  it("rejects invented operands, wrong units, and zero baselines", () => {
    expect(() =>
      calculate(
        { operation: "difference", operands: [{ ...operands[0], value: 9999 }, operands[1]] },
        [source],
      ),
    ).toThrow("not present");
    expect(() =>
      calculate(
        { operation: "difference", operands: [operands[0], { ...operands[1], unit: "index" }] },
        [source],
      ),
    ).toThrow("matching units");
    expect(() =>
      calculate(
        { operation: "percentage_change", operands: [{ ...operands[0], value: 0 }, operands[1]] },
        [{ ...source, rows: [{ rowNumber: 1, data: { Renda: "0" } }, source.rows![1]] }],
      ),
    ).toThrow("zero baseline");
  });
  it("accepts a complete full-source aggregate and keeps row counts distinct from people", () => {
    const aggregate: Evidence = {
      ...source,
      datasetId: "population",
      totalRows: 1000,
      rowsAreSample: true,
      rows: [{ rowNumber: 1, data: { Valor: "1200" } }],
      aggregate: {
        operation: "sum",
        field: "Valor",
        unit: "people",
        value: "1700000",
        status: "complete",
      },
    };
    expect(
      calculate(
        {
          operation: "sum",
          operands: [{ label: "Population", value: 1700000, unit: "people", evidenceId: "rents" }],
        },
        [aggregate],
      ).result,
    ).toBe(1700000);
    expect(() =>
      calculate(
        {
          operation: "sum",
          operands: [{ label: "Rows", value: 1000, unit: "people", evidenceId: "rents" }],
        },
        [aggregate],
      ),
    ).toThrow("not present");
  });
});
