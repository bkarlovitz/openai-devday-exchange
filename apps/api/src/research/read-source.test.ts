import { describe, expect, it } from "vitest";
import { visibleText, verifyExcerpt } from "./read-source";
import { datasetEvidence } from "./research-claim";

describe("retained source evidence", () => {
  it("removes executable markup and retains original visible quotation text", () => {
    const text = visibleText(
      "<html><script>invented()</script><p>Barcelona &amp; Catalunya: 1.000 persones.</p></html>",
    );
    expect(text).toBe("Barcelona & Catalunya: 1.000 persones.");
    expect(verifyExcerpt(text, "Barcelona & Catalunya: 1.000 persones.")).toBe(text);
    expect(() => verifyExcerpt(text, "Barcelona has two million people.")).toThrow("not found");
  });

  it("pins database provenance and preserves raw codes and periods", () => {
    const evidence = datasetEvidence("claim", 0, {
      snapshot: {
        id: "10",
        datasetId: "incasol",
        resourceKey: "qww9-bvhh",
        resourceUrl: "https://example.org/source.csv",
        sha256: "hash",
        fetchedAt: "2026-01-01",
        lastSeenAt: "2026-01-02",
        rowCount: 1,
      },
      query: { datasetId: "incasol", filters: [], limit: 25, offset: 0 },
      fields: [{ name: "Any", type: "text", role: "period" }],
      totalRows: 1,
      rowsAreSample: false,
      rows: [
        { rowNumber: 3, data: { Any: "2025", "Codi territorial": "08019", Renda: "1135.55" } },
      ],
    });
    expect(evidence.snapshotId).toBe("10");
    expect(evidence.rows?.[0].data["Codi territorial"]).toBe("08019");
    expect(evidence.sourceDate).toBe("2025");
    expect(evidence.query).toMatchObject({ snapshotId: "10" });
  });
});
