(() => {
  const statuses = globalThis.liveFactStatuses;
  let videoKey = "";
  let timeline = new Map();
  let revision = 0;
  let notices = [];
  let enabled = false;
  let noticeHost, noticeTimer;
  let demo, job, retry;
  let liveBackend = null;
  let replayUntil = -1;
  let feedback = "";
  let captions = [];
  let visibleCaption = "";
  let previousPosition = null;

  function player() {
    return location.pathname === "/watch" ? document.getElementById("movie_player") : null;
  }

  function identity() {
    return player() ? new URLSearchParams(location.search).get("v") : "";
  }

  function dismiss() {
    clearTimeout(noticeTimer);
    noticeHost?.remove();
    noticeHost = null;
  }

  function showNextNotice() {
    const parent = player();
    if (!enabled || noticeHost || !parent || parent.classList.contains("ad-showing")) return;
    const item = notices.shift();
    if (!item) return;
    const status = statuses[item.status];
    const host = document.createElement("div");
    host.style.cssText =
      "position:absolute;right:12px;top:12px;z-index:60;width:240px;max-width:calc(100% - 24px);pointer-events:auto";
    const root = host.attachShadow({ mode: "open" });
    const label = item.label || status.label;
    root.innerHTML = `<style>
      button{display:block;width:100%;padding:7px 9px 8px;border-radius:11px;border:1px solid var(--edge);box-sizing:border-box;
      background:var(--wash);color:#302d27;box-shadow:0 2px 12px #221b1b3b;font:650 12px/1.3 system-ui;text-align:left;cursor:pointer}
      button:focus-visible{outline:2px solid var(--state);outline-offset:2px}
      .top{display:flex;align-items:center;gap:5px;color:var(--state);min-width:0}
      i{display:grid;place-items:center;flex:none;width:17px;height:17px;border-radius:50%;border:1px solid var(--edge);font:700 11px/1 system-ui}
      .state{font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      small{margin-left:auto;color:var(--state);font-size:9px;white-space:nowrap}
      .subject{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;
      overflow-wrap:anywhere;margin-top:3px;padding-left:2px;font-size:12px;line-height:1.26}
      @media(prefers-reduced-motion:no-preference){button{animation:enter .18s ease-out}@keyframes enter{from{opacity:0;transform:translateY(-3px)}}}
    </style><button type="button" aria-describedby="subject"><span class="top"><i aria-hidden="true"></i><span class="state"></span><small aria-hidden="true"></small></span><span class="subject" id="subject"></span></button>`;
    const button = root.querySelector("button");
    button.style.setProperty("--state", status.color);
    button.style.setProperty("--wash", status.wash);
    button.style.setProperty("--edge", status.edge);
    button.querySelector("i").textContent = status.icon;
    button.querySelector(".state").textContent = label;
    button.querySelector(".subject").textContent = item.assertion;
    button.querySelector("small").textContent = item.demo ? "Ensayo ↗" : "↗";
    button.setAttribute("aria-label", label + ". Abrir en LiveFact");
    button.title = item.assertion;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      chrome.runtime.sendMessage({ type: "open" }).catch(() => {});
      selected = item.id;
      revision++;
    });
    parent.append(host);
    noticeHost = host;
    noticeTimer = setTimeout(() => {
      dismiss();
      showNextNotice();
    }, 3300);
  }

  let selected = "";
  function publish(item) {
    const previous = timeline.get(item.id);
    timeline.set(item.id, item);
    revision++;
    if (!enabled || previous?.status === item.status) return;
    notices = notices.filter((notice) => notice.id !== item.id).slice(-3);
    notices.push(item);
    showNextNotice();
  }

  function setFeedback(text) {
    if (feedback === text) return;
    feedback = text;
    revision++;
  }

  function clock(video) {
    if (!video) return { position: 0, start: 0, end: null };
    const seekable = video.seekable;
    const position = video.currentTime;
    if (seekable.length && (!Number.isFinite(video.duration) || seekable.start(0) > 0)) {
      const range = seekable.length - 1;
      return { position, start: seekable.start(range), end: seekable.end(range) };
    }
    return { position, start: 0, end: Number.isFinite(video.duration) ? video.duration : null };
  }

  function currentVideo() {
    return player()?.querySelector("video");
  }

  function collectCaption(position) {
    const caption = Array.from(player().querySelectorAll(".ytp-caption-segment"), (node) =>
      node.textContent.trim(),
    )
      .filter(Boolean)
      .join(" ");
    if (caption === visibleCaption) return;
    visibleCaption = caption;
    if (!caption) return;
    const recent = captions.at(-1);
    if (recent?.text === caption && position - recent.seconds < 1.5) return;
    if (recent && caption.startsWith(recent.text + " ") && position - recent.seconds < 3) {
      recent.text = caption;
    } else {
      captions.push({ text: caption, seconds: position });
    }
  }

  function tick() {
    const key = identity();
    if (key !== videoKey) {
      videoKey = key;
      timeline = new Map();
      notices = [];
      demo = job = retry = liveBackend = null;
      replayUntil = -1;
      captions = [];
      visibleCaption = selected = feedback = "";
      previousPosition = null;
      revision++;
      dismiss();
    }
    const video = currentVideo();
    if (!key || !video || player().classList.contains("ad-showing")) {
      previousPosition = null;
      dismiss();
      return;
    }
    const position = video.currentTime;
    const elapsed = previousPosition === null ? 0 : position - previousPosition;
    if (elapsed < -0.5) replayUntil = Math.max(previousPosition, replayUntil);
    if (elapsed > 0 && elapsed <= 2.5 && previousPosition < replayUntil && enabled && !demo) {
      for (const item of timeline.values()) {
        if (item.startSeconds > previousPosition && item.startSeconds <= position)
          notices.push(item);
      }
    }
    previousPosition = position;
    if (elapsed < 0 || elapsed > 2.5) {
      captions = [];
      visibleCaption = "";
    }
    if (elapsed >= 0 && elapsed <= 2.5 && demo) {
      demo.elapsed += elapsed;
      for (const next of demo.steps) {
        if (next.shown || demo.elapsed < next.after) continue;
        next.shown = true;
        publish({
          ...next.item,
          startSeconds: timeline.get(next.item.id)?.startSeconds ?? position,
        });
      }
      if (demo.steps.every((next) => next.shown)) {
        demo = null;
        setFeedback("Ensayo completo. Pulsa una marca para volver a ese momento.");
      }
    }
    if (!liveBackend) captions = captions.filter((item) => item.seconds >= position - 25);
    collectCaption(position);
    if (
      liveBackend &&
      !job &&
      captions.length &&
      (position - captions[0].seconds >= 6 || video.ended)
    ) {
      startCheck(liveBackend, captions.splice(0, 80));
    }
    showNextNotice();
  }

  async function startDemo() {
    const key = videoKey;
    const sample = await chrome.runtime.sendMessage({ type: "sample" });
    if (key !== videoKey || !sample) return;
    const video = currentVideo();
    if (!video || job || liveBackend) return;
    if (
      Number.isFinite(video.duration) &&
      video.duration >= 12 &&
      video.duration - video.currentTime < 12
    ) {
      video.currentTime = 0;
    }
    for (const [id, item] of timeline) if (item.demo) timeline.delete(id);
    notices = notices.filter((notice) => !notice.demo);
    dismiss();
    const first = { id: "demo-rent", demo: true, kind: "fact", assertion: sample.assertion };
    demo = {
      elapsed: 0,
      steps: [
        { after: 1, item: { ...first, status: "pending" } },
        { after: 4, item: { ...first, ...sample, status: "supported" } },
        {
          after: 8,
          item: {
            id: "demo-cause",
            demo: true,
            kind: "argument",
            status: "context",
            label: "Falta contexto",
            assertion: "¿Qué explica la subida del alquiler?",
            context:
              "Incasòl publica rentas de contratos con fianza depositada. La serie describe cómo cambian los importes.",
            argument:
              "Comparar dos trimestres ayuda a medir el cambio. Para evaluar una causa harían falta comparaciones adicionales.",
            source: sample.source,
          },
        },
        {
          after: 12,
          item: {
            id: "demo-scope",
            demo: true,
            kind: "fact",
            status: "contradicted",
            assertion: "La renta del tramo bajó en Barcelona",
            evidence: sample.evidence,
            context: "La serie compara el mismo tramo y trimestre en Barcelona.",
            source: sample.source,
          },
        },
      ],
    };
    previousPosition = currentVideo()?.currentTime ?? null;
    setFeedback("Ensayo activo. Reproduce el vídeo para ver las marcas de ejemplo.");
  }

  const verdictStatus = {
    supported: "supported",
    contradicted: "contradicted",
    mixed_evidence: "mixed",
    insufficient_evidence: "context",
  };

  function claimState(claim) {
    if (claim.status === "error") return { status: "unavailable", label: "Error de comprobación" };
    if (claim.status === "not_checkable") return { status: "unavailable", label: "No verificable" };
    if (claim.status === "complete" && claim.verdict) {
      return {
        status: verdictStatus[claim.verdict],
        label: claim.verdict === "insufficient_evidence" ? "Evidencia insuficiente" : undefined,
      };
    }
    return { status: "pending" };
  }

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function check(jobState) {
    const request = (type, data) =>
      chrome.runtime.sendMessage({ type, backend: jobState.backend, ...data });
    try {
      if (!jobState.runId) {
        const receipt = await request("submit", { submission: jobState.submission });
        if (job !== jobState) return;
        if (!receipt?.value) throw new Error(receipt?.error || "El servidor no respondió.");
        jobState.runId = receipt.value.runId;
      }
      setFeedback("Buscando afirmaciones en los subtítulos…");
      let lastRevision = -1;
      for (let attempt = 0; job === jobState && attempt < 60; attempt++) {
        const result = await request("load", { runId: jobState.runId });
        if (job !== jobState) return;
        if (!result?.value) throw new Error(result?.error || "El servidor no respondió.");
        const run = result.value;
        if (run.revision !== lastRevision) {
          lastRevision = run.revision;
          for (const claim of run.claims) {
            publish({
              id: claim.claimId,
              startSeconds: claim.startSeconds,
              assertion: claim.assertion,
              quote: claim.quote,
              context: claim.context,
              speaker: claim.speaker,
              metadata: [claim.place, ...claim.dates, claim.metric, claim.comparison]
                .filter(Boolean)
                .join(" · "),
              kind: "fact",
              ...claimState(claim),
              error: claim.error,
              claimRef:
                claim.status === "complete" || claim.status === "not_checkable"
                  ? { backend: jobState.backend, runId: run.runId, claimId: claim.claimId }
                  : undefined,
            });
          }
          if (run.status === "processing")
            setFeedback("Contrastando las afirmaciones con las fuentes…");
        }
        if (!["queued", "extracting", "processing"].includes(run.status)) {
          retry = null;
          if (run.status === "error")
            setFeedback(run.error || "El servidor encontró un error al extraer afirmaciones.");
          else if (run.claims.length)
            setFeedback("Análisis finalizado. Abre una marca para ver el resultado.");
          else if (run.status === "awaiting_processing")
            setFeedback("El servidor ha guardado el fragmento y tiene pendiente procesarlo.");
          else setFeedback("El servidor no encontró afirmaciones verificables en ese fragmento.");
          return;
        }
        await delay(2000);
      }
      if (job === jobState) {
        liveBackend = null;
        setFeedback("El análisis sigue en curso. Puedes volver a consultar el mismo envío.");
      }
    } catch (error) {
      if (job === jobState) {
        liveBackend = null;
        setFeedback(error.message);
      }
    } finally {
      if (job === jobState) {
        job = null;
        revision++;
      }
    }
  }

  function startCheck(backend, batch = captions) {
    if (job) return;
    const saved = retry?.backend === backend ? retry : null;
    if (!saved && !batch.length) {
      setFeedback("Activa los subtítulos CC y reproduce unos segundos antes de analizar.");
      return;
    }
    let text = "";
    const passages = batch.map((cue) => {
      if (text) text += "\n";
      const start = text.length;
      text += cue.text;
      return { start, end: text.length, startSeconds: cue.seconds };
    });
    job = saved || {
      backend,
      submission: {
        submissionKey: crypto.randomUUID(),
        text,
        explanationLanguage: "es",
        source: {
          url: location.origin + "/watch?v=" + encodeURIComponent(videoKey),
          title: document.title,
        },
        passages,
      },
    };
    retry = job;
    setFeedback("Enviando fragmento…");
    void check(job);
  }

  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    tick();
    const video = currentVideo();
    if (message.type === "snapshot") {
      reply({
        videoKey,
        ready: Boolean(videoKey && video),
        title: document.title.replace(/ - YouTube$/, ""),
        enabled,
        clock: clock(video),
        revision,
        selected,
        feedback,
        busy: Boolean(job),
        live: Boolean(liveBackend),
        retry: retry?.backend ?? null,
        entries: [...timeline.values()].sort(
          (a, b) => (a.startSeconds ?? Infinity) - (b.startSeconds ?? Infinity),
        ),
      });
    }
    if (!videoKey || !video) return;
    if (message.type === "live") {
      if (liveBackend) {
        liveBackend = job = retry = null;
        captions = [];
        setFeedback("Análisis detenido.");
      } else if (!job) {
        liveBackend = message.backend;
        demo = null;
        for (const [id, item] of timeline) if (item.demo) timeline.delete(id);
        notices = [];
        dismiss();
        captions = [];
        visibleCaption = "";
        setFeedback("Reproduce el vídeo con CC. Esperando subtítulos…");
        if (retry && retry.backend === liveBackend) startCheck(liveBackend);
        else retry = null;
      }
      revision++;
      reply(true);
    }
    if (message.type === "demo") {
      if (liveBackend || job) {
        reply(false);
        return;
      }
      void startDemo().catch(() => setFeedback("No se pudo iniciar el ensayo. Recarga el vídeo."));
      reply(true);
    }
    if (message.type === "capture") {
      startCheck(message.backend);
      reply(true);
    }
    if (message.type === "assessment") {
      const item = timeline.get(message.id);
      if (!item?.claimRef) {
        reply(null);
        return;
      }
      chrome.runtime
        .sendMessage({ type: "detail", ...item.claimRef })
        .then(reply, () => reply(null));
      return true;
    }
    if (message.type === "seek") {
      const { start, end } = clock(video);
      const at = message.seconds;
      const valid =
        Number.isFinite(at) &&
        end !== null &&
        at >= start &&
        at <= end &&
        !player().classList.contains("ad-showing");
      if (valid) {
        video.currentTime = at;
        const item = message.id && timeline.get(message.id);
        if (enabled && item) {
          dismiss();
          notices = [item];
          showNextNotice();
        }
      }
      reply(valid);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.enabled) return;
    enabled = changes.enabled.newValue;
    revision++;
    if (!enabled) {
      notices = [];
      dismiss();
    }
  });
  chrome.storage.local.get({ enabled: true }).then((settings) => {
    enabled = settings.enabled;
    tick();
  });
  setInterval(tick, 300);
})();
