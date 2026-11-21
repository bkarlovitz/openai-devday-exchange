globalThis.liveFactStatuses = Object.freeze({
  pending: { icon: "◷", label: "Comprobando", color: "#5c5d58", wash: "#efefea", edge: "#d7d8d1" },
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
    color: "#78591b",
    wash: "#f8edd2",
    edge: "#e6d6af",
  },
  context: {
    icon: "◐",
    label: "Falta contexto",
    color: "#815709",
    wash: "#fff2cc",
    edge: "#e6cb85",
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
