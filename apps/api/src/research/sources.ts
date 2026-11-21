type SourceEntry = { url: string; purpose: string };

type SourceCollection = {
  domains: string[];
  entryPoints: SourceEntry[];
  document?: { datasetId: string; title: string };
};

type SourceCollections = Record<string, SourceCollection> & { general: SourceCollection };

const councilRecords = {
  url: "https://ajuntament.barcelona.cat/ca/accio-de-govern/el-consell-municipal",
  purpose: "Council agendas, decisions and minutes",
};

const councilMinutes = { datasetId: "minutes", title: "Barcelona City Council minutes" };

export const sourceCollections: SourceCollections = {
  housing: {
    domains: [
      "ajuntament.barcelona.cat",
      "opendata-ajuntament.barcelona.cat",
      "habitatge.gencat.cat",
      "analisi.transparenciacatalunya.cat",
      "ine.es",
    ],
    entryPoints: [
      {
        url: "https://analisi.transparenciacatalunya.cat/api/views/qww9-bvhh",
        purpose: "Incasòl municipal rental deposits and reported average rents",
      },
      {
        url: "https://www.ine.es/jaxiT3/Tabla.htm?t=59061",
        purpose: "INE rental price index series by district",
      },
      councilRecords,
    ],
    document: councilMinutes,
  },
  population: {
    domains: [
      "opendata-ajuntament.barcelona.cat",
      "ajuntament.barcelona.cat",
      "idescat.cat",
      "ine.es",
    ],
    entryPoints: [
      {
        url: "https://opendata-ajuntament.barcelona.cat/data/api/3/action/package_show?id=pad_mdbas",
        purpose: "Barcelona municipal population register by census section",
      },
    ],
  },
  tourism: {
    domains: [
      "opendata-ajuntament.barcelona.cat",
      "ajuntament.barcelona.cat",
      "observatoriturisme.barcelona",
    ],
    entryPoints: [
      {
        url: "https://opendata-ajuntament.barcelona.cat/data/api/3/action/package_show?id=habitatges-us-turistic",
        purpose: "Official register of tourist dwellings and their capacity",
      },
      councilRecords,
    ],
    document: councilMinutes,
  },
  municipal: {
    domains: [
      "ajuntament.barcelona.cat",
      "bop.diba.cat",
      "dogc.gencat.cat",
      "contractaciopublica.cat",
    ],
    entryPoints: [councilRecords],
    document: councilMinutes,
  },
  general: {
    domains: ["ajuntament.barcelona.cat", "gencat.cat", "ine.es", "boe.es"],
    entryPoints: [
      { url: "https://www.boe.es/", purpose: "Official Spanish gazette and legislation" },
    ],
  },
};

export function sourceCollection(topic: string, collections = sourceCollections): SourceCollection {
  return Object.hasOwn(collections, topic) ? collections[topic]! : collections.general;
}

export const datasetGuidance: Record<string, string> = {
  incasol:
    "Verified period labels: Q1=gener-març, Q2=abril-juny, Q3=juliol-setembre, Q4=octubre-desembre. gener-juny means the first HALF YEAR and gener-setembre means the first NINE MONTHS. Annual=gener-desembre. For Barcelona municipality use Àmbit territorial=Municipi and Codi territorial=08019. Preserve the exact claimed price band. Published average rent for > 600 euros/mes cannot establish the average for every rent.",
  population:
    "Use Data_Referencia for the exact January reference date. Counts across census sections may be summed only within the requested date and geographic scope. Valor is people; geographic codes are strings.",
  "tourist-flats":
    "A published current register supports counts at that snapshot, not historical counts. Count distinct N_EXPEDIENT for registered dwellings and sum NUMERO_PLACES for capacity, preserving their distinct units. District and neighbourhood codes have leading zeroes.",
  "ine-59061":
    "Select the exact COD series and Anyo. Retain FK_Unidad and FK_Escala. Valor is an index or variation defined by its series, never an average rent in euros. Secreto or missing Valor cannot establish a value.",
};
