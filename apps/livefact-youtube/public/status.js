globalThis.liveFactStatuses = Object.freeze({
  pending: { icon: "◷", label: "Comprobando", color: "#8b5e1b", wash: "#fff2d6", edge: "#e8d19e" },
  supported: {
    icon: "✓",
    label: "Respaldada por la fuente",
    color: "#367051",
    wash: "#eaf4ea",
    edge: "#c7ddca",
  },
  mixed: {
    icon: "◐",
    label: "Evidencia mixta",
    color: "#79543a",
    wash: "#faebdd",
    edge: "#eed4bd",
  },
  context: {
    icon: "◐",
    label: "Falta contexto",
    color: "#695788",
    wash: "#f0eaf6",
    edge: "#dfd3e9",
  },
  contradicted: {
    icon: "×",
    label: "Contradicha por la fuente",
    color: "#a04143",
    wash: "#fae9e6",
    edge: "#ecc9c5",
  },
  unavailable: {
    icon: "–",
    label: "Sin comprobar",
    color: "#625e57",
    wash: "#f2eee7",
    edge: "#e2dbce",
  },
});
