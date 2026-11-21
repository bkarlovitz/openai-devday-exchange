import type { SourceField } from "@council/contracts";

const numericFields: Record<string, Record<string, string>> = {
  incasol: { Renda: "EUR/month", Habitatges: "contracts" },
  population: { Valor: "people" },
  "tourist-flats": { NUMERO_PLACES: "places" },
  "ine-59061": { Valor: "source-defined index or variation" },
};
const periodFields: Record<string, string[]> = {
  incasol: ["Any", "Període"],
  population: ["Data_Referencia", "Any"],
  "tourist-flats": [],
  "ine-59061": ["Anyo", "Fecha", "FK_Periodo"],
};

export function describeFields(datasetId: string, row: Record<string, unknown>): SourceField[] {
  return Object.keys(row)
    .sort()
    .map((name) => {
      const unit = numericFields[datasetId]?.[name];
      return {
        name,
        type: unit ? "number" : "text",
        unit,
        role: periodFields[datasetId]?.includes(name) ? "period" : undefined,
      };
    });
}
