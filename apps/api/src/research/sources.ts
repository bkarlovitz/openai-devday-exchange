export const officialSources: Record<string, string[]> = {
  housing: [
    "ajuntament.barcelona.cat",
    "opendata-ajuntament.barcelona.cat",
    "habitatge.gencat.cat",
    "analisi.transparenciacatalunya.cat",
    "ine.es",
  ],
  population: [
    "opendata-ajuntament.barcelona.cat",
    "ajuntament.barcelona.cat",
    "idescat.cat",
    "ine.es",
  ],
  tourism: [
    "opendata-ajuntament.barcelona.cat",
    "ajuntament.barcelona.cat",
    "observatoriturisme.barcelona",
  ],
  municipal: [
    "ajuntament.barcelona.cat",
    "bop.diba.cat",
    "dogc.gencat.cat",
    "contractaciopublica.cat",
  ],
  general: ["ajuntament.barcelona.cat", "gencat.cat", "ine.es", "boe.es"],
};

export function preferredDomains(topic: string) {
  return officialSources[topic] ?? officialSources.general;
}

export const datasetGuidance: Record<string, string> = {
  incasol:
    "Verified period labels: Q1=gener-març, Q2=abril-juny, Q3=juliol-setembre, Q4=octubre-desembre. gener-juny means the first HALF YEAR and gener-setembre means the first NINE MONTHS. Annual=gener-desembre. For Barcelona municipality use Àmbit territorial=Municipi and Codi territorial=08019. Preserve the exact claimed price band. Published average rent for > 600 euros/mes cannot establish the average for every rent.",
  population:
    "Use Data_Referencia for the exact January reference date. Counts across census sections may be summed only within the requested date and geographic scope. Valor is people; geographic codes are strings.",
  "tourist-flats":
    "A published current register supports counts at that snapshot, not historical counts. Use count for dwellings and sum NUMERO_PLACES for capacity, preserving their distinct units. District and neighbourhood codes have leading zeroes.",
  "ine-59061":
    "Select the exact COD series and Anyo. Retain FK_Unidad and FK_Escala. Valor is an index or variation defined by its series, never an average rent in euros. Secreto or missing Valor cannot establish a value.",
};

// The council minutes can contain decisions in any of these policy areas.
export const documentCollections: Readonly<Record<string, { datasetId: string; title: string }>> = {
  housing: { datasetId: "minutes", title: "Barcelona City Council minutes" },
  tourism: { datasetId: "minutes", title: "Barcelona City Council minutes" },
  municipal: { datasetId: "minutes", title: "Barcelona City Council minutes" },
};
