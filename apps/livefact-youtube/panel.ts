import { YOUTUBE_MAX_INTERVAL_SECONDS, youtubeVideoId } from "@council/contracts";
import type { Claim, ClaimDetail } from "@council/contracts";

type Status = "pending" | "supported" | "context" | "contradicted" | "mixed" | "unavailable";
type Filter = "all" | "fact" | "argument";
type Backend = "local" | "team";

declare global {
  var liveFactStatuses: Record<
    Status,
    { icon: string; label: string; color: string; marker: string; wash: string; edge: string }
  >;
}

type Entry = {
  id: string;
  status: Status;
  assertion: string;
  kind: Exclude<Filter, "all">;
  label?: string;
  error?: string;
  claimRef?: object;
  demo?: boolean;
  saved?: boolean;
  runUrl?: string;
  quote?: Claim["quote"];
  context?: Claim["context"];
  speaker?: Claim["speaker"];
  startSeconds?: Claim["startSeconds"];
  metadata?: string;
  argument?: string;
  evidence?: string;
  source?: { label: string; url: string };
};
type Snapshot = {
  videoKey: string;
  ready: boolean;
  title: string;
  enabled: boolean;
  clock: { position: number; start: number; end: number | null };
  revision: number;
  selected: string;
  feedback: string;
  busy: boolean;
  live: boolean;
  retry: Backend | null;
  entries: Entry[];
};

function el<T extends HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

const enabled = el<HTMLInputElement>("enabled");
const noticeSound = el<HTMLInputElement>("notice-sound");
const previewNotice = el<HTMLButtonElement>("preview-notice");
const seek = el<HTMLInputElement>("seek");
const marks = el("marks");
const entries = el("entries");
const feedback = el("feedback");
const demo = el<HTMLButtonElement>("demo");
const live = el<HTMLButtonElement>("live");
const capture = el<HTMLButtonElement>("capture");
const backend = el<HTMLSelectElement>("backend");
const filters = el("filters");
const workspace = el("workspace");
const newItems = el<HTMLButtonElement>("new-items");
let filter: Filter = "all";
let panelMode: "live" | "link" = "live";
let activeTab: number | undefined;
const claimDetails = new Map<string, Promise<ClaimDetail>>();
let lastKey = "";
let lastRevision = -1;
let lastSelected = "";
let activeEntry = "";
let range = { start: 0, end: null as number | null };
let lastSnapshot: Snapshot | undefined;

function time(seconds: number) {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = String(total % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${minutes}:${remainder}`;
}

async function send<T>(message: object, tabId = activeTab): Promise<T | undefined> {
  if (tabId === undefined) return;
  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as T;
  } catch {
    return undefined;
  }
}

async function jump(seconds: number, id?: string) {
  if (!(await send<boolean>({ type: "seek", seconds, id }))) {
    feedback.textContent = "Ese momento no está disponible en el reproductor.";
  }
}

function highlight(id: string, scroll = true) {
  activeEntry = id;
  const detail = document.getElementById(`entry-${id}`) as HTMLDetailsElement | null;
  if (detail?.closest(".row")?.hasAttribute("hidden")) {
    filter = "all";
    const items = lastSnapshot?.entries ?? [];
    syncFilters(items);
    syncMarkers(items, range.start, range.end);
  }
  if (detail) {
    detail.open = true;
    if (scroll) detail.scrollIntoView({ block: "nearest" });
  }
  for (const marker of marks.querySelectorAll("button")) {
    marker.setAttribute(
      "aria-current",
      String(marker.dataset.ids?.split(" ").includes(id) ?? false),
    );
  }
}

function appendDetail(container: HTMLElement, title: string, text: string | undefined) {
  if (!text) return;
  const paragraph = document.createElement("p");
  const label = document.createElement("b");
  label.textContent = title;
  paragraph.append(label, text);
  container.append(paragraph);
}

function sourceLink(title: string, url: string) {
  const source = document.createElement("a");
  source.textContent = title;
  try {
    const target = new URL(url);
    if (target.protocol === "https:" || target.protocol === "http:") {
      source.href = target.href;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent += " ↗";
    }
  } catch {
    // Some imported records only have an unresolvable source title.
  }
  return source;
}

function renderAssessment(container: HTMLElement, result: ClaimDetail) {
  const { assessment, evidence } = result;
  appendDetail(container, "Qué respalda la evidencia", assessment?.explanation);
  appendDetail(container, "Límites e incertidumbre", assessment?.uncertainty.join(" "));
  if (!assessment)
    appendDetail(container, "Contexto de la revisión", result.research?.notes.join(" "));
  for (const calculation of assessment?.calculations ?? []) {
    const result = calculation.result.toLocaleString("es", { maximumFractionDigits: 4 });
    appendDetail(container, `Cálculo · ${result} ${calculation.unit}`, calculation.formula);
  }
  if (!evidence.length) {
    if (!container.childNodes.length)
      container.textContent = "El servidor no aportó evidencia para esta afirmación.";
    return;
  }

  const heading = document.createElement("h3");
  heading.textContent = evidence.length === 1 ? "Fuente" : `Fuentes · ${evidence.length}`;
  container.append(heading);
  for (const item of evidence) {
    const card = document.createElement("details");
    card.className = "source-detail";
    const summary = document.createElement("summary");
    summary.textContent = item.title;
    const link = sourceLink("Abrir fuente", item.sourceUrl);
    const metadata = [
      item.sourceDate,
      item.pageNumber === undefined ? undefined : `Pág. ${item.pageNumber}`,
      assessment?.evidenceIds.includes(item.evidenceId) ? "Citada en el resultado" : undefined,
    ]
      .filter(Boolean)
      .join(" · ");
    appendDetail(card, "Referencia", metadata);
    appendDetail(card, "Evidencia", item.text);
    if (item.rowsAreSample) {
      appendDetail(
        card,
        "Cobertura",
        `${item.rows?.length ?? 0} filas de muestra de ${item.totalRows ?? "la consulta"}.`,
      );
    }
    card.prepend(summary);
    card.append(link);
    container.append(card);
  }
}

function bindAssessment(outer: HTMLDetailsElement, container: HTMLElement, id: string) {
  let rendered = false;
  async function load() {
    if (!outer.open || rendered) return;
    container.textContent = "Cargando evidencia…";
    let request = claimDetails.get(id);
    if (!request) {
      request = send<{ value?: ClaimDetail; error?: string }>({ type: "assessment", id }).then(
        (response) => {
          if (!response?.value)
            throw new Error(response?.error ?? "No se pudo abrir la evidencia.");
          return response.value;
        },
      );
      claimDetails.set(id, request);
    }
    try {
      const result = await request;
      if (rendered) return;
      rendered = true;
      container.replaceChildren();
      renderAssessment(container, result);
    } catch (error) {
      if (claimDetails.get(id) === request) claimDetails.delete(id);
      container.textContent =
        error instanceof Error ? error.message : "No se pudo abrir la evidencia.";
    }
  }
  outer.addEventListener("toggle", () => void load());
  void load();
}

function renderEntry(item: Entry, opened: Set<string>) {
  const status = liveFactStatuses[item.status];
  const row = document.createElement("li");
  row.className = "row";
  row.dataset.kind = item.kind;
  row.dataset.status = item.status;
  row.style.setProperty("--state", status.color);
  row.style.setProperty("--wash", status.wash);
  row.style.setProperty("--edge", status.edge);

  const details = document.createElement("details");
  details.id = `entry-${item.id}`;
  details.open = opened.has(details.id);
  const meta = document.createElement("div");
  meta.className = "entry-meta";
  if (item.startSeconds !== undefined) {
    const seconds = item.startSeconds;
    const timestamp = document.createElement("button");
    timestamp.className = "stamp";
    timestamp.textContent = "▶ " + time(seconds);
    timestamp.setAttribute("aria-label", `Volver a ${time(seconds)}`);
    timestamp.addEventListener("click", () => {
      highlight(item.id, false);
      void jump(seconds, item.id);
    });
    meta.append(timestamp);
  }
  const kind = document.createElement("span");
  kind.className = "kind";
  kind.textContent =
    (item.kind === "argument" ? "Argumento" : "Dato") +
    (item.saved ? " · Guardado" : item.demo ? " · Ensayo" : "");
  meta.append(kind);
  if (item.speaker) {
    const speaker = document.createElement("span");
    speaker.className = "speaker";
    speaker.textContent = item.speaker;
    meta.append(speaker);
  }

  const summary = document.createElement("summary");
  const state = document.createElement("span");
  state.className = "result";
  state.textContent = `${status.icon} ${item.label || status.label}`;
  const assertion = document.createElement("strong");
  assertion.className = "claim";
  assertion.textContent = item.assertion;
  const action = document.createElement("span");
  action.className = "analysis-label";
  action.textContent = "Análisis";
  const summaryFooter = document.createElement("span");
  summaryFooter.className = "summary-footer";
  summaryFooter.append(state);
  const rulingText: Partial<Record<Status, string>> = {
    supported: "Checks out.",
    mixed: "Jury’s still out.",
    context: "Jury’s still out.",
    contradicted: "Spectacular miss.",
  };
  if (rulingText[item.status]) {
    const ruling = document.createElement("span");
    ruling.className = "ruling";
    ruling.lang = "en";
    ruling.textContent = rulingText[item.status]!;
    summaryFooter.append(ruling);
  }
  summaryFooter.append(action);
  const claimLine = document.createElement("span");
  claimLine.className = "claim-line";
  const symbol = document.createElement("span");
  symbol.className = "status-symbol";
  symbol.textContent = status.icon;
  symbol.setAttribute("aria-hidden", "true");
  claimLine.append(assertion, symbol);
  summary.append(claimLine, summaryFooter);

  const detail = document.createElement("div");
  detail.className = "detail";
  if (item.quote && item.quote !== item.assertion) {
    const quote = document.createElement("blockquote");
    quote.textContent = `«${item.quote}»`;
    detail.append(quote);
  }
  appendDetail(detail, "Qué muestra el dato", item.evidence);
  const context = item.context && item.context !== item.quote ? item.context : item.metadata;
  if (context && context.length > 180) {
    const disclosure = document.createElement("details");
    disclosure.className = "context-detail";
    const heading = document.createElement("summary");
    heading.textContent = "Ver contexto completo";
    const paragraph = document.createElement("p");
    paragraph.textContent = context;
    disclosure.append(heading, paragraph);
    detail.append(disclosure);
  } else {
    appendDetail(detail, "Contexto", context);
  }
  appendDetail(detail, "Qué podemos concluir", item.argument);
  if (item.error) {
    const reason = item.error.includes("sources failed retrieval")
      ? "No se pudieron consultar las fuentes."
      : item.error.includes("calculation operand")
        ? "La fuente citada no contiene todos los datos del cálculo."
        : "El servidor no pudo completar esta comprobación.";
    appendDetail(detail, "Estado", reason);
    const diagnostic = document.createElement("details");
    diagnostic.className = "context-detail";
    const heading = document.createElement("summary");
    heading.textContent = "Detalle técnico";
    diagnostic.append(heading, document.createTextNode(item.error));
    detail.append(diagnostic);
  }
  if (item.source) detail.append(sourceLink(item.source.label, item.source.url));
  if (item.runUrl)
    detail.append(
      document.createElement("br"),
      sourceLink("Abrir comprobación original", item.runUrl),
    );
  if (item.claimRef) {
    const assessment = document.createElement("div");
    detail.append(assessment);
    bindAssessment(details, assessment, item.id);
  }
  if (!detail.childNodes.length) appendDetail(detail, "Evidencia", status.label);
  details.append(summary, detail);
  row.append(meta, details);
  return row;
}

function syncFilters(items: Entry[]) {
  const mixed =
    items.some((item) => item.kind === "argument") && items.some((item) => item.kind === "fact");
  if (!mixed) filter = "all";
  filters.hidden = items.length === 0;
  for (const button of filters.querySelectorAll("button")) {
    const category = button.dataset.filter;
    button.hidden = category === "argument" && !items.some((item) => item.kind === "argument");
    button.setAttribute("aria-pressed", String(category === filter));
    button.querySelector("span")!.textContent = String(
      category === "all" ? items.length : items.filter((item) => item.kind === category).length,
    );
  }
  for (const row of entries.querySelectorAll<HTMLElement>(".row")) {
    row.hidden = filter !== "all" && filter !== row.dataset.kind;
  }
}

function syncSummary(items: Entry[]) {
  el("review-summary").hidden = items.length === 0;
  const track = el("summary-track");
  const counts = el("summary-counts");
  track.replaceChildren();
  counts.replaceChildren();
  const groups = new Map<Status, number>();
  for (const item of items) groups.set(item.status, (groups.get(item.status) ?? 0) + 1);
  const labels: Record<Status, string> = {
    supported: "Respaldadas",
    contradicted: "Contradichas",
    mixed: "Coincide en parte",
    context: "Faltan pruebas",
    pending: "Comprobando",
    unavailable: "Sin comprobar",
  };
  for (const [status, count] of groups) {
    const color = liveFactStatuses[status].marker;
    const segment = document.createElement("span");
    segment.style.width = `${(count / items.length) * 100}%`;
    segment.style.background = color;
    track.append(segment);
    const label = document.createElement("span");
    const dot = document.createElement("i");
    dot.style.background = color;
    label.append(dot, `${count} ${labels[status]}`);
    counts.append(label);
  }
}

function renderMarkers(items: Entry[], start: number, end: number) {
  const groups: { entry: Entry; fraction: number; seconds: number }[][] = [];
  const spacing = 20 / Math.max(marks.clientWidth, 250);
  const chronological = [...items].sort(
    (a, b) => (a.startSeconds ?? Infinity) - (b.startSeconds ?? Infinity),
  );
  for (const entry of chronological) {
    const seconds = entry.startSeconds;
    if (seconds === undefined || seconds < start || seconds > end) continue;
    const value = { entry, seconds, fraction: (seconds - start) / (end - start) };
    const previous = groups.at(-1);
    if (previous && value.fraction - previous[0].fraction < spacing) previous.push(value);
    else groups.push([value]);
  }

  return groups.map((group) => {
    const { entry, seconds, fraction } = group[0];
    const status = liveFactStatuses[entry.status];
    const button = document.createElement("button");
    button.className = "marker";
    button.dataset.ids = group.map(({ entry }) => entry.id).join(" ");
    button.style.left = `${fraction * 100}%`;
    button.title =
      group.length > 1
        ? `${time(seconds)} · ${group.length} afirmaciones cercanas`
        : `${time(seconds)} · ${entry.label || status.label} · ${entry.assertion}`;
    button.setAttribute("aria-label", button.title);
    button.setAttribute(
      "aria-current",
      String(group.some(({ entry }) => entry.id === activeEntry)),
    );
    button.hidden = filter !== "all" && !group.some(({ entry }) => entry.kind === filter);
    for (const color of new Set(group.map(({ entry }) => liveFactStatuses[entry.status].marker))) {
      const line = document.createElement("span");
      line.style.background = color;
      button.append(line);
    }
    button.addEventListener("click", () => {
      const matching = group.filter(({ entry }) => filter === "all" || entry.kind === filter);
      const first = matching[0];
      if (!first) return;
      for (const { entry } of matching) highlight(entry.id, false);
      highlight(first.entry.id);
      document.getElementById(`entry-${first.entry.id}`)?.querySelector("summary")?.focus();
      void jump(first.seconds, first.entry.id);
    });
    return button;
  });
}

function syncMarkers(items: Entry[], start: number, end: number | null) {
  marks.replaceChildren(...(end !== null && end > start ? renderMarkers(items, start, end) : []));
}

function syncCapture() {
  capture.textContent =
    lastSnapshot?.retry === backend.value ? "Reintentar análisis" : "Analizar subtítulos recientes";
  capture.disabled = !lastSnapshot?.ready || lastSnapshot.busy;
}

function render(snapshot: Snapshot | undefined, tabId: number | undefined) {
  lastSnapshot = snapshot;
  const key = snapshot?.ready ? `${tabId}:${snapshot.videoKey}` : "";
  if (key !== lastKey) {
    activeEntry = "";
    filter = "all";
    claimDetails.clear();
  }
  const items = snapshot?.entries ?? [];
  const follow = workspace.scrollTop < 100;
  const priorCount = entries.children.length;
  document.body.dataset.live = String(Boolean(snapshot?.live));
  document.body.dataset.busy = String(Boolean(snapshot?.busy));
  el("footer-status").textContent = !snapshot?.ready
    ? "Abre un vídeo para comenzar"
    : snapshot.busy
      ? "Comprobando afirmaciones…"
      : snapshot.live
        ? "Leyendo subtítulos visibles"
        : items.length
          ? `${items.length} afirmaciones · consulta las fuentes`
          : "Listo para analizar subtítulos";
  const clock = snapshot?.clock ?? { position: 0, start: 0, end: null };
  const rangeChanged = clock.start !== range.start || clock.end !== range.end;
  const entriesChanged = key !== lastKey || snapshot?.revision !== lastRevision;
  el("video").textContent = snapshot?.ready ? snapshot.title : "Abre un vídeo de YouTube";
  el("mode").textContent = snapshot?.live
    ? "Análisis en directo"
    : items.some((item) => item.demo)
      ? "YouTube · Ensayo"
      : "YouTube";
  el("timeline").hidden = !snapshot?.ready;
  el("controls").hidden = panelMode !== "live" || !snapshot?.ready;
  el("empty").textContent = !snapshot?.ready
    ? "Al abrir un vídeo, podrás revisar las citas y volver a su minuto desde este panel."
    : "Activa CC y analiza un fragmento para ver sus afirmaciones en la línea de tiempo.";
  if (snapshot) enabled.checked = snapshot.enabled;
  previewNotice.disabled = !snapshot?.ready || !snapshot.enabled;
  previewNotice.title = !snapshot?.ready
    ? "Abre un vídeo en YouTube"
    : !snapshot.enabled
      ? "Activa Avisos para probarlo"
      : "Mostrar un aviso en el vídeo";
  syncCapture();
  demo.disabled = !snapshot?.ready || snapshot.busy || snapshot.live;
  capture.disabled ||= Boolean(snapshot?.live);
  backend.disabled = Boolean(snapshot?.live || snapshot?.busy);
  live.disabled = !snapshot?.ready || (snapshot.busy && !snapshot.live);
  live.textContent = snapshot?.live ? "Detener análisis" : "Iniciar análisis en directo";
  seek.disabled = !snapshot?.ready || clock.end === null || clock.end <= clock.start;
  seek.min = String(clock.start);
  seek.max = String(clock.end ?? 1);
  if (document.activeElement !== seek) seek.value = String(clock.position);
  const fraction = seek.disabled
    ? 0
    : (clock.position - clock.start) / ((clock.end ?? 1) - clock.start);
  seek.style.setProperty("--progress", `${Math.max(0, Math.min(1, fraction)) * 100}%`);
  el("current").textContent = time(clock.position);
  el("start").textContent = time(clock.start);
  el("end").textContent = clock.end === null ? "—" : time(clock.end);
  el("empty").hidden = items.length > 0;
  el("empty-mark").hidden = items.length > 0;
  if (entriesChanged) {
    const focused = document.activeElement?.closest<HTMLDetailsElement>(".row > details")?.id;
    const savedScroll = workspace.scrollTop;
    const open = new Set(Array.from(entries.querySelectorAll("details[open]"), (node) => node.id));
    entries.replaceChildren(
      ...items.map((item) => renderEntry(item, key === lastKey ? open : new Set())),
    );
    feedback.textContent = snapshot?.feedback ?? "";
    feedback.hidden =
      !snapshot?.live &&
      !!items.length &&
      ["Ensayo completo.", "Análisis finalizado."].some((prefix) =>
        feedback.textContent?.startsWith(prefix),
      );
    syncFilters(items);
    syncSummary(items);
    if (focused)
      document.getElementById(focused)?.querySelector("summary")?.focus({ preventScroll: true });
    if (key === lastKey && items.length > priorCount) {
      if (follow) workspace.scrollTop = 0;
      else newItems.hidden = false;
    } else workspace.scrollTop = savedScroll;
    if (key !== lastKey) newItems.hidden = true;
  }
  if (rangeChanged || entriesChanged) syncMarkers(items, clock.start, clock.end);
  range = clock;
  if (snapshot?.selected && (snapshot.selected !== lastSelected || key !== lastKey)) {
    highlight(snapshot.selected);
  }
  lastSelected = snapshot?.selected ?? "";
  lastKey = key;
  lastRevision = snapshot?.revision ?? -1;
}

newItems.addEventListener("click", () => {
  workspace.scrollTo({ top: 0, behavior: "smooth" });
  newItems.hidden = true;
});
workspace.addEventListener("scroll", () => {
  if (workspace.scrollTop < 100) newItems.hidden = true;
});

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  activeTab = tab?.id;
  render(await send<Snapshot>({ type: "snapshot" }, tab?.id), tab?.id);
}

async function watch() {
  try {
    await refresh();
  } finally {
    setTimeout(() => void watch(), 550);
  }
}

filters.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-filter]");
  if (!button) return;
  filter = button.dataset.filter as Filter;
  const items = lastSnapshot?.entries ?? [];
  syncFilters(items);
  syncMarkers(items, range.start, range.end);
});
enabled.addEventListener(
  "change",
  () => void chrome.storage.local.set({ enabled: enabled.checked }),
);
backend.addEventListener("change", () => {
  void chrome.storage.local.set({ backend: backend.value });
  syncCapture();
});
noticeSound.addEventListener("change", () => {
  void chrome.storage.local.set({ noticeSound: noticeSound.checked });
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.noticeSound)
    noticeSound.checked = changes.noticeSound.newValue === true;
});
previewNotice.addEventListener("click", async () => {
  if (!(await send<boolean>({ type: "previewNotice" }))) {
    feedback.hidden = false;
    feedback.textContent = "Abre el vídeo y espera a que termine cualquier anuncio.";
  }
});
seek.addEventListener("change", () => void jump(Number(seek.value)));
live.addEventListener("click", () => {
  live.disabled = true;
  void send({ type: "live", backend: backend.value });
});
demo.addEventListener("click", () => void send({ type: "demo" }));
capture.addEventListener("click", () => {
  capture.disabled = true;
  void send({ type: "capture", backend: backend.value });
});
const linkForm = el<HTMLFormElement>("link-form");
const linkUrl = el<HTMLInputElement>("link-url");
const liveModeButton = el<HTMLButtonElement>("mode-live");
const linkModeButton = el<HTMLButtonElement>("mode-link");

function selectMode(mode: typeof panelMode) {
  panelMode = mode;
  liveModeButton.setAttribute("aria-pressed", String(mode === "live"));
  linkModeButton.setAttribute("aria-pressed", String(mode === "link"));
  el("controls").hidden = mode !== "live" || !lastSnapshot?.ready;
  el("link-panel").hidden = mode !== "link";
  if (mode === "link" && !linkUrl.value && lastSnapshot?.ready) {
    linkUrl.value = "https://www.youtube.com/watch?v=" + lastSnapshot.videoKey;
  }
}

liveModeButton.addEventListener("click", () => selectMode("live"));
linkModeButton.addEventListener("click", () => selectMode("link"));
linkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = el("link-message");
  const button = linkForm.querySelector("button")!;
  const id = youtubeVideoId(linkUrl.value.trim());
  if (!id) {
    status.textContent = "Introduce un enlace watch o youtu.be válido.";
    return;
  }
  const url = new URL(linkUrl.value);
  const raw = url.searchParams.get("t") ?? url.searchParams.get("start");
  const offset = raw?.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  const at = offset
    ? Number(offset[1] || 0) * 3600 + Number(offset[2] || 0) * 60 + Number(offset[3] || 0)
    : undefined;
  const same = lastSnapshot?.ready && id === lastSnapshot.videoKey;
  const start = el<HTMLInputElement>("link-start").value;
  const fromSeconds = start
    ? Number(start)
    : (at ?? (same ? Math.floor(lastSnapshot!.clock.position) : 0));
  const end = el<HTMLInputElement>("link-end").value;
  const toSeconds = end ? Number(end) : undefined;
  if (
    !Number.isInteger(fromSeconds) ||
    fromSeconds < 0 ||
    fromSeconds >= 86400 ||
    (toSeconds !== undefined &&
      (!Number.isInteger(toSeconds) ||
        toSeconds <= fromSeconds ||
        toSeconds > 86400 ||
        toSeconds - fromSeconds > YOUTUBE_MAX_INTERVAL_SECONDS))
  ) {
    status.textContent = `Elige un intervalo válido de hasta ${YOUTUBE_MAX_INTERVAL_SECONDS} segundos.`;
    return;
  }
  const targetBackend = backend.value;
  button.disabled = true;
  status.textContent = "Abriendo el fragmento…";
  try {
    let target = activeTab;
    if (!same) {
      target = (
        await chrome.tabs.create({
          url: "https://www.youtube.com/watch?v=" + id + "&t=" + fromSeconds + "s",
        })
      ).id;
    }
    for (let i = 0; i < 50; i++) {
      const snapshot = await send<Snapshot>({ type: "snapshot" }, target);
      if (snapshot?.ready && snapshot.videoKey === id) {
        const accepted = await send<boolean>(
          { type: "importLink", backend: targetBackend, videoId: id, fromSeconds, toSeconds },
          target,
        );
        status.textContent = accepted
          ? "Tramo enviado al servidor."
          : "Comprueba el intervalo y espera a que termine el análisis activo.";
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    status.textContent = "El reproductor todavía no está listo. Vuelve a intentarlo.";
  } catch {
    status.textContent = "No se pudo abrir el vídeo. Vuelve a intentarlo.";
  } finally {
    button.disabled = false;
  }
});
void chrome.storage.local
  .get({ enabled: true, backend: "team", noticeSound: false })
  .then((settings) => {
    enabled.checked = settings.enabled !== false;
    noticeSound.checked = settings.noticeSound === true;
    backend.value = settings.backend === "local" ? "local" : "team";
    void watch();
  });
