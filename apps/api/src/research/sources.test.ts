import { describe, expect, it } from "vitest";
import { sourceCollection, sourceCollections } from "./sources";

describe("topic source collections", () => {
  it("uses replacement sources for a topic and retains the general fallback", () => {
    const replacement = {
      domains: ["replacement.example"],
      entryPoints: [{ url: "https://replacement.example/records", purpose: "Test records" }],
      document: { datasetId: "replacement", title: "Replacement minutes" },
    };
    const collections = { ...sourceCollections, tourism: replacement };
    expect(sourceCollection("tourism", collections)).toEqual(replacement);
    expect(sourceCollection("housing", collections)).toBe(sourceCollections.housing);
    expect(sourceCollection("unmapped", collections)).toBe(sourceCollections.general);
    expect(sourceCollection("constructor", collections)).toBe(sourceCollections.general);
  });
});
