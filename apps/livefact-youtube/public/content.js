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
  let savedClipArmed = false;
  const clip = {
    id: "saved-housing-48",
    saved: true,
    kind: "fact",
    status: "mixed",
    startSeconds: 855,
    speaker: "Pedro Sánchez",
    assertion: "La vivienda en Europa subió un 48 % en la última década",
    noticeText: "Vivienda en la UE: el 48 % corresponde a 2010–2023",
    evidence: "Eurostat registra un aumento del 48 % en la UE entre 2010 y 2023.",
    argument: "La cifra coincide. El periodo abarca trece años y el ámbito de la serie es la UE.",
    source: {
      label: "Eurostat · Housing in Europe 2024",
      url: "https://ec.europa.eu/eurostat/web/interactive-publications/housing-2024",
    },
    runUrl:
      "https://council-checker-dev.snapnda.workers.dev/runs/efce044b-942d-4dee-a77e-f047c5642210",
  };
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
      "position:absolute;right:12px;top:12px;z-index:60;container-type:inline-size;width:clamp(228px,44%,370px);max-width:calc(100% - 24px);pointer-events:auto";
    const root = host.attachShadow({ mode: "open" });
    const label = item.label || status.label;
    root.innerHTML = `<style>
      button{display:block;width:100%;padding:11px 14px;border-radius:13px;border:1px solid var(--edge);border-inline-start:4px solid var(--state);box-sizing:border-box;
      background:var(--wash);color:#302d27;box-shadow:0 2px 5px #221b1b16,0 6px 20px #221b1b26;font:600 13px/1.35 system-ui;text-align:left;cursor:pointer}
      button:focus-visible{outline:2px solid var(--state);outline-offset:2px}
      .top,.foot{display:flex;align-items:center;gap:6px}
      .top{width:fit-content;max-width:100%;box-sizing:border-box;border-radius:14px;padding:3px 9px 3px 5px;
      background:var(--state);color:#fff;font-size:12px;font-weight:700;line-height:1.3}
      i{display:grid;place-items:center;flex:none;width:17px;height:17px;border-radius:50%;background:#fff;color:var(--state);font:700 12px/1 system-ui}
      .subject{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;overflow:hidden;
      overflow-wrap:anywhere;margin:7px 0;font-size:clamp(14px,5.4cqi,19px);font-weight:680;line-height:1.28}
      .foot{font-size:11px;color:#554f46;font-variant-numeric:tabular-nums}
      .action{margin-left:auto;color:var(--state)}
      @media(prefers-reduced-motion:no-preference){button{animation:enter .15s ease-out}@keyframes enter{from{opacity:0;transform:translateY(-3px)}}}
    </style><button type="button" aria-describedby="subject"><span class="top"><i aria-hidden="true"></i><span class="state"></span></span><span class="subject" id="subject"></span><span class="foot"><span class="origin"></span><span class="action"></span></span></button>`;
    const button = root.querySelector("button");
    button.style.setProperty("--state", status.color);
    button.style.setProperty("--wash", status.wash);
    button.style.setProperty("--edge", status.edge);
    button.querySelector("i").textContent = status.icon;
    button.querySelector(".state").textContent = label;
    button.querySelector(".subject").textContent = item.noticeText || item.assertion;
    const t = Math.floor(item.startSeconds);
    const stamp = Number.isFinite(t)
      ? Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0")
      : "";
    button.querySelector(".origin").textContent = [
      "LiveFact",
      item.preview ? "Ejemplo" : item.saved ? "Guardado" : item.demo ? "Ensayo" : "",
      stamp,
    ]
      .filter(Boolean)
      .join(" · ");
    button.querySelector(".action").textContent = item.preview ? "Cerrar ×" : "Ver análisis ↗";
    button.setAttribute(
      "aria-label",
      item.preview ? "Cerrar aviso de ejemplo" : label + ". Abrir en LiveFact",
    );
    button.title = item.assertion;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (item.preview) {
        dismiss();
        showNextNotice();
        return;
      }
      chrome.runtime.sendMessage({ type: "open" }).catch(() => {});
      selected = item.id;
      revision++;
    });
    parent.append(host);
    noticeHost = host;
    function scheduleDismiss() {
      clearTimeout(noticeTimer);
      if (host.matches(":hover") || root.activeElement) return;
      noticeTimer = setTimeout(() => {
        dismiss();
        showNextNotice();
      }, 5500);
    }
    host.addEventListener("pointerenter", () => clearTimeout(noticeTimer));
    host.addEventListener("pointerleave", scheduleDismiss);
    button.addEventListener("focus", () => clearTimeout(noticeTimer));
    button.addEventListener("blur", scheduleDismiss);
    button.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        dismiss();
        showNextNotice();
      }
    });
    scheduleDismiss();
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
      savedClipArmed = key === "kvm8yYvF1Ws" && location.hash === "#livefact-demo";
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
    if (savedClipArmed && position >= clip.startSeconds && position < 880) {
      savedClipArmed = false;
      publish(clip);
      setFeedback("Comprobación guardada del discurso del 13 de enero de 2025.");
    }
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
    savedClipArmed = false;
    timeline.delete(clip.id);
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
    if (claim.status === "error")
      return { status: "unavailable", label: statuses.unavailable.label };
    if (claim.status === "not_checkable") return { status: "unavailable", label: "No verificable" };
    if (claim.status === "complete" && claim.verdict) {
      return {
        status: verdictStatus[claim.verdict],
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
        const receipt = await request(jobState.youtube ? "submitYoutube" : "submit", {
          submission: jobState.submission,
        });
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
    const saved = !retry?.youtube && retry?.backend === backend ? retry : null;
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
        retry: retry?.youtube ? null : (retry?.backend ?? null),
        entries: [...timeline.values()].reverse(),
      });
    }
    if (!videoKey || !video) return;
    if (message.type === "importLink") {
      if (message.videoId !== videoKey || job || liveBackend) {
        reply(false);
        return;
      }
      const fromSeconds = message.fromSeconds;
      const videoEnd = clock(video).end;
      const toSeconds =
        message.toSeconds ??
        Math.min(fromSeconds + 30, Math.floor(videoEnd ?? fromSeconds + 30), 86400);
      if (
        !Number.isInteger(fromSeconds) ||
        fromSeconds < 0 ||
        !Number.isInteger(toSeconds) ||
        toSeconds <= fromSeconds ||
        toSeconds > 86400 ||
        (videoEnd !== null && fromSeconds >= videoEnd)
      ) {
        setFeedback("El inicio elegido está fuera del vídeo.");
        reply(false);
        return;
      }
      const reuse =
        retry?.youtube &&
        retry.backend === message.backend &&
        retry.submission.fromSeconds === fromSeconds &&
        retry.submission.toSeconds === toSeconds;
      job = reuse
        ? retry
        : {
            backend: message.backend,
            youtube: true,
            submission: {
              url: "https://www.youtube.com/watch?v=" + videoKey,
              fromSeconds,
              toSeconds,
              submissionKey: crypto.randomUUID(),
              explanationLanguage: "es",
            },
          };
      retry = job;
      savedClipArmed = false;
      demo = null;
      for (const [id, item] of timeline) if (item.demo || item.saved) timeline.delete(id);
      notices = [];
      dismiss();
      setFeedback("Importando los subtítulos del enlace…");
      void check(job);
      reply(true);
    }
    if (message.type === "live") {
      if (liveBackend) {
        liveBackend = job = retry = null;
        captions = [];
        setFeedback("Análisis detenido.");
      } else if (!job) {
        liveBackend = message.backend;
        savedClipArmed = false;
        timeline.delete(clip.id);
        demo = null;
        for (const [id, item] of timeline) if (item.demo) timeline.delete(id);
        notices = [];
        dismiss();
        captions = [];
        visibleCaption = "";
        setFeedback("Reproduce el vídeo con CC. Esperando subtítulos…");
        if (retry && !retry.youtube && retry.backend === liveBackend) startCheck(liveBackend);
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
    if (message.type === "previewNotice") {
      if (!enabled || player().classList.contains("ad-showing")) {
        reply(false);
        return;
      }
      dismiss();
      const latest = [...timeline.values()].at(-1);
      notices.unshift(latest || { ...clip, preview: true, startSeconds: undefined });
      showNextNotice();
      reply(true);
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
