import { createApiClient } from "@council/contracts";
import type { Submission, YoutubeSubmission } from "@council/contracts";
import { Effect } from "effect";
import sample from "../../eval/fixtures/incasol-barcelona-q2.json";

const localApi = createApiClient("http://localhost:8787");
const teamApi = createApiClient("https://council-checker-dev.snapnda.workers.dev");

const demo = {
  assertion: "El alquiler subió un 0,47 % en este tramo",
  quote: sample.assertion,
  context:
    "La comparación se refiere a Barcelona, al tramo de más de 600 €/mes y al segundo trimestre de cada año.",
  argument:
    "La subida describe ese tramo. Para atribuirla a una política haría falta comparar periodos, zonas y otros factores.",
  evidence: "De 1.135,55 a 1.140,89 €/mes entre abril y junio de 2025 y de 2026 (+0,47 %).",
  source: {
    label: "Incasòl · Fianzas de alquiler",
    url: "https://analisi.transparenciacatalunya.cat/d/qww9-bvhh",
  },
};

type Message =
  | { type: "sample" }
  | { type: "open" }
  | { type: "submit"; backend: "local" | "team"; submission: Submission }
  | { type: "submitYoutube"; backend: "local" | "team"; submission: YoutubeSubmission }
  | { type: "load"; backend: "local" | "team"; runId: string }
  | { type: "detail"; backend: "local" | "team"; runId: string; claimId: string };

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener(
  (message: Message, sender: chrome.runtime.MessageSender, reply: (result: unknown) => void) => {
    if (sender.tab?.id === undefined) return;
    if (message.type === "open") {
      void chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
      return;
    }
    if (message.type === "sample") {
      reply(demo);
      return;
    }
    const api = message.backend === "team" ? teamApi : localApi;
    if (message.type === "submitYoutube") {
      Effect.runPromise(api.saveYoutubeSubmission(message.submission)).then(
        (value) => reply({ value }),
        (cause: Error) =>
          reply({ error: "No se pudo importar el tramo de YouTube. " + cause.message }),
      );
      return true;
    }
    if (message.type === "submit") {
      Effect.runPromise(
        api.saveSubmission(message.submission).pipe(Effect.timeout("10 seconds")),
      ).then(
        (value) => reply({ value }),
        () =>
          reply({
            error: "No se pudo guardar el fragmento. Comprueba el servidor y vuelve a intentarlo.",
          }),
      );
      return true;
    }
    if (message.type === "detail") {
      Effect.runPromise(
        api.loadClaim(message.runId, message.claimId, AbortSignal.timeout(8000)),
      ).then(
        (value) => reply({ value }),
        () =>
          reply({
            error: "No se pudo abrir la evidencia. Vuelve a abrir el análisis para reintentar.",
          }),
      );
      return true;
    }
    if (message.type === "load") {
      Effect.runPromise(api.loadRun(message.runId, AbortSignal.timeout(8000))).then(
        (value) => reply({ value }),
        () => reply({ error: "No se pudo consultar la comprobación." }),
      );
      return true;
    }
  },
);
