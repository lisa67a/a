function pickList(payload) {
  return (
    payload?.results ||
    payload?.data ||
    payload?.items ||
    payload?.list ||
    payload?.series ||
    []
  );
}

function proxyImage(url, width, quality) {
  if (!url) return "";
  const params = new URLSearchParams();
  params.set("url", url);
  if (Number.isFinite(width) && width > 0) {
    params.set("w", String(width));
  }
  if (Number.isFinite(quality) && quality > 0) {
    params.set("q", String(quality));
  }
  return `/api/image?${params.toString()}`;
}

const CONTINUE_TTL_MS = 30 * 60 * 1000;
const CONTINUE_MAX_ITEMS = 20;
const META_TTL_MS = 30 * 60 * 1000;
const SERIES_TTL_MS = 30 * 60 * 1000;
const CLIENT_CACHE_TTL_MS = 2 * 60 * 1000;
const AUTO_NEXT_THRESHOLD_SEC = 0.6;

function getClientCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (Date.now() - payload.timestamp > CLIENT_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return payload.data;
  } catch (err) {
    return null;
  }
}

function setClientCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (err) {
    return;
  }
}

async function fetchWithCache(url) {
  const cached = getClientCache(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Gagal memuat data");
  const data = await res.json();
  setClientCache(url, data);
  return data;
}

const QUALITY_ORDER = ["1080p", "720p", "480p", "360p", "240p"];

function sortQualities(qualities) {
  return qualities.slice().sort((a, b) => {
    const indexA = QUALITY_ORDER.indexOf(a);
    const indexB = QUALITY_ORDER.indexOf(b);
    const rankA = indexA === -1 ? 999 : indexA;
    const rankB = indexB === -1 ? 999 : indexB;
    return rankA - rankB;
  });
}

function buildStreamUrl(videoId, quality) {
  const params = new URLSearchParams();
  params.set("video_id", videoId);
  if (quality) {
    params.set("quality", quality);
  }
  return `/api/stream?${params.toString()}`;
}

function updatePlayerSource(player, source, url, options = {}) {
  if (!player || !url) return;
  const { preserveTime = false, autoPlay = false } = options;
  const resumeTime = preserveTime ? player.currentTime : 0;
  const shouldResume = preserveTime && Number.isFinite(resumeTime) && resumeTime > 0;

  if (source) {
    source.src = url;
    player.load();
  } else {
    player.src = url;
  }

  const onLoaded = () => {
    if (shouldResume) {
      player.currentTime = resumeTime;
    }
    if (autoPlay) {
      player.play().catch(() => {});
    }
    player.removeEventListener("loadedmetadata", onLoaded);
  };
  player.addEventListener("loadedmetadata", onLoaded);
}

function fillQualitySelect(select, qualities, preferredValue = null) {
  if (!select) return "";
  const desired = preferredValue !== null ? preferredValue : select.value || "";
  select.innerHTML = "<option value=\"\">Auto</option>";
  const sorted = sortQualities(qualities);
  sorted.forEach((quality) => {
    const option = document.createElement("option");
    option.value = quality;
    option.textContent = quality.toUpperCase();
    select.appendChild(option);
  });
  const nextValue = sorted.includes(desired) ? desired : "";
  select.value = nextValue;
  select.disabled = sorted.length === 0;
  return nextValue;
}

async function loadHomeMore() {
  const grid = document.getElementById("home-grid");
  const status = document.getElementById("home-status");
  if (!grid || grid.dataset.loading === "true") return;

  const currentOffset = Number(grid.dataset.offset || 0);
  grid.dataset.loading = "true";
  status.textContent = "Memuat...";
  const skeletons = [];
  for (let i = 0; i < 6; i += 1) {
    const skeleton = document.createElement("div");
    skeleton.className = "card skeleton";
    skeleton.innerHTML = "<div class=\"card-poster\"></div><div class=\"card-body\"><h3></h3></div>";
    grid.appendChild(skeleton);
    skeletons.push(skeleton);
  }

  try {
    const payload = await fetchWithCache(`/api/home?offset=${currentOffset}`);
    const list = pickList(payload);

    skeletons.forEach((node) => node.remove());
    list.forEach((item) => {
      const id = item.series_id || item.id || item.slug;
      const title = item.title || item.name || "Untitled";
      const poster = item.poster || item.thumbnail || item.cover || "";
      const posterUrl = proxyImage(poster, 480, 80);

      const card = document.createElement("a");
      card.className = "card";
      card.href = `/series/${id}`;
      card.dataset.seriesId = id;
      card.dataset.seriesTitle = title;
      card.dataset.seriesPoster = poster;
      card.innerHTML = `
        <div class="card-poster lazy-bg" data-bg="${posterUrl}"></div>
        <div class="card-body"><h3>${title}</h3></div>
        <div class="card-overlay"><span>Detail</span></div>
      `;
      grid.appendChild(card);
    });
    initLazyBackgrounds();

    grid.dataset.offset = currentOffset + list.length;
    status.textContent = list.length ? "" : "Tidak ada data lagi.";
  } catch (err) {
    skeletons.forEach((node) => node.remove());
    status.textContent = err.message || "Terjadi kesalahan";
  } finally {
    grid.dataset.loading = "false";
  }
}

function initHomePagination() {
  const loadButton = document.querySelector("[data-action='load-home']");
  if (!loadButton) return;

  loadButton.addEventListener("click", () => loadHomeMore());

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        loadHomeMore();
      }
    });
  });

  observer.observe(loadButton);
}

function initPlayerOverlay() {
  const player = document.getElementById("player");
  const overlay = document.getElementById("player-overlay");
  if (!player || !overlay) return;

  const hideOverlay = () => overlay.classList.add("hidden");
  const showOverlay = () => overlay.classList.remove("hidden");

  player.addEventListener("canplay", hideOverlay);
  player.addEventListener("playing", hideOverlay);
  player.addEventListener("waiting", showOverlay);
  player.addEventListener("error", () => {
    overlay.textContent = "Gagal memuat video.";
    showOverlay();
  });
}

function initHeroCarousel() {
  const carousel = document.querySelector("[data-action='hero-carousel']");
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll(".spotlight-card"));
  const dots = Array.from(carousel.querySelectorAll(".dot"));
  if (slides.length <= 1) return;

  let index = 0;
  let timerId;

  const setActive = (nextIndex) => {
    slides[index].classList.remove("active");
    dots[index].classList.remove("active");
    index = nextIndex;
    slides[index].classList.add("active");
    dots[index].classList.add("active");
  };

  const schedule = () => {
    clearInterval(timerId);
    timerId = setInterval(() => {
      const nextIndex = (index + 1) % slides.length;
      setActive(nextIndex);
    }, 6000);
  };

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const nextIndex = Number(dot.dataset.dot || 0);
      setActive(nextIndex);
      schedule();
    });
  });

  schedule();
}

function getContinueWatching() {
  try {
    const items = JSON.parse(localStorage.getItem("continueWatching") || "[]");
    const now = Date.now();
    const filtered = items.filter(
      (item) => item?.updatedAt && now - item.updatedAt < CONTINUE_TTL_MS
    );
    if (filtered.length !== items.length) {
      localStorage.setItem("continueWatching", JSON.stringify(filtered));
    }
    return filtered;
  } catch (err) {
    return [];
  }
}

function setContinueWatching(items) {
  localStorage.setItem("continueWatching", JSON.stringify(items));
}

function getVideoMeta() {
  try {
    const payload = JSON.parse(localStorage.getItem("videoMeta") || "{}");
    const now = Date.now();
    const next = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (value?.updatedAt && now - value.updatedAt < META_TTL_MS) {
        next[key] = value;
      }
    });
    localStorage.setItem("videoMeta", JSON.stringify(next));
    return next;
  } catch (err) {
    return {};
  }
}

function setVideoMeta(payload) {
  localStorage.setItem("videoMeta", JSON.stringify(payload));
}

function getSeriesMeta() {
  try {
    const payload = JSON.parse(localStorage.getItem("seriesMeta") || "{}");
    const now = Date.now();
    const next = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (value?.updatedAt && now - value.updatedAt < SERIES_TTL_MS) {
        next[key] = value;
      }
    });
    localStorage.setItem("seriesMeta", JSON.stringify(next));
    return next;
  } catch (err) {
    return {};
  }
}

function setSeriesMeta(payload) {
  localStorage.setItem("seriesMeta", JSON.stringify(payload));
}

function getSeriesEpisodes() {
  try {
    const payload = JSON.parse(localStorage.getItem("seriesEpisodes") || "{}");
    const now = Date.now();
    const next = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (value?.updatedAt && now - value.updatedAt < SERIES_TTL_MS) {
        next[key] = value;
      }
    });
    localStorage.setItem("seriesEpisodes", JSON.stringify(next));
    return next;
  } catch (err) {
    return {};
  }
}

function setSeriesEpisodes(payload) {
  localStorage.setItem("seriesEpisodes", JSON.stringify(payload));
}

function storeSeriesEpisodes(seriesId, episodes) {
  if (!seriesId || !Array.isArray(episodes) || episodes.length === 0) return;
  const payload = getSeriesEpisodes();
  payload[seriesId] = {
    episodes: episodes.map((ep) => ({ videoId: ep.videoId, title: ep.title })),
    updatedAt: Date.now()
  };
  setSeriesEpisodes(payload);
}

function getNextEpisodeForVideo(videoId) {
  if (!videoId) return null;
  const meta = getVideoMeta();
  const info = meta[videoId];
  if (!info?.seriesId) return null;
  const seriesPayload = getSeriesEpisodes();
  const series = seriesPayload[info.seriesId];
  const episodes = Array.isArray(series?.episodes) ? series.episodes : [];
  if (!episodes.length) return null;

  let index = Number.isInteger(info.episodeIndex) ? info.episodeIndex : -1;
  if (index < 0) {
    index = episodes.findIndex((ep) => ep.videoId === videoId);
  }
  if (index === -1 || index >= episodes.length - 1) return null;
  return episodes[index + 1];
}

function initContinueWatching() {
  const track = document.getElementById("continue-track");
  if (!track) return;

  const items = getContinueWatching();
  track.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "state";
    empty.textContent = "Belum ada riwayat tontonan.";
    track.appendChild(empty);
    return;
  }

  items.slice(0, 10).forEach((item) => {
    const card = document.createElement("a");
    card.className = "continue-card";
    card.href = `/watch/${item.videoId}?title=${encodeURIComponent(item.title)}`;
    card.innerHTML = `
      <div class="continue-title">${item.title}</div>
      <div class="continue-meta">Lanjut dari ${Math.floor(item.time)}s</div>
    `;
    track.appendChild(card);
  });
}

function initWatchHistory() {
  const wrap = document.querySelector(".player-wrap");
  const player = document.getElementById("player");
  if (!wrap || !player) return;

  const videoId = wrap.dataset.videoId;
  const title = wrap.dataset.title || "Episode";
  let lastSave = 0;

  player.addEventListener("timeupdate", () => {
    const now = Date.now();
    if (now - lastSave < 5000) return;
    lastSave = now;
    const items = getContinueWatching();
    const next = items.filter((item) => item.videoId !== videoId);
    next.unshift({ videoId, title, time: player.currentTime, updatedAt: now });
    setContinueWatching(next.slice(0, CONTINUE_MAX_ITEMS));
  });
}

function storeEpisodeMeta(videoId, episodeTitle, seriesId, episodeIndex) {
  const seriesHead = document.querySelector(".series-head");
  if (!seriesHead || !videoId) return;
  const seriesTitle = seriesHead.dataset.seriesTitle || "";
  const seriesPoster = seriesHead.dataset.seriesPoster || "";
  const meta = getVideoMeta();
  meta[videoId] = {
    title: episodeTitle || seriesTitle || "Episode",
    seriesTitle,
    poster: seriesPoster,
    seriesId: seriesId || seriesHead.dataset.seriesId || "",
    episodeIndex: Number.isInteger(episodeIndex) ? episodeIndex : undefined,
    updatedAt: Date.now()
  };
  setVideoMeta(meta);
}

function applyWatchMeta() {
  const head = document.querySelector(".watch-head");
  if (!head) return;
  const videoId = head.dataset.videoId;
  const meta = getVideoMeta();
  const info = meta[videoId];
  if (!info) return;

  const title = document.getElementById("watch-title");
  const poster = document.getElementById("watch-poster");
  const player = document.getElementById("player");
  if (title && (!title.textContent || title.textContent === "Watch")) {
    title.textContent = info.title || info.seriesTitle || "Episode";
  }
  if (poster && info.poster) {
    poster.style.backgroundImage = `url('${proxyImage(info.poster, 480, 80)}')`;
  }
  if (player && info.poster) {
    player.poster = proxyImage(info.poster, 480, 80);
  }
}

function initSeriesPlayer() {
  const player = document.getElementById("series-player");
  const source = document.getElementById("series-player-source");
  const overlay = document.getElementById("series-player-overlay");
  const title = document.getElementById("series-episode-title");
  const prevButton = document.querySelector("[data-action='episode-prev']");
  const nextButton = document.querySelector("[data-action='episode-next']");
  const qualitySelect = document.getElementById("series-quality");
  const dataNode = document.getElementById("series-episodes-data");
  const seriesHead = document.querySelector(".series-head");
  const seriesId = seriesHead?.dataset.seriesId || "";
  if (!player || !source || !dataNode) return;

  let episodes = [];
  try {
    episodes = JSON.parse(dataNode.textContent || "[]");
  } catch (err) {
    episodes = [];
  }

  const normalized = episodes
    .map((ep) => {
      const videoId = ep?.video_id || ep?.id || ep?.slug || "";
      const index = ep?.index || ep?.no || ep?.number;
      const episodeTitle =
        ep?.title ||
        ep?.name ||
        (index ? `Episode ${index}` : videoId ? `Episode ${videoId}` : "Episode");
      return { videoId, title: episodeTitle };
    })
    .filter((ep) => ep.videoId);

  episodes = normalized;
  storeSeriesEpisodes(seriesId, episodes);

  let currentIndex = episodes.length ? 0 : -1;
  let currentVideoId = "";
  let currentTitle = "";
  let preferredQuality = "";
  let activeQuality = "";
  let lastSave = 0;
  let autoAdvanceTriggered = false;

  const updateNavState = () => {
    if (prevButton) prevButton.disabled = currentIndex <= 0;
    if (nextButton) {
      nextButton.disabled = currentIndex === -1 || currentIndex >= episodes.length - 1;
    }
  };

  const loadQualities = (videoId) => {
    if (!qualitySelect || !videoId) return;
    qualitySelect.disabled = true;
    fetchWithCache(`/api/stream-info?video_id=${videoId}`)
      .then((payload) => {
        const data = payload?.data || payload || {};
        const qualities = Object.keys(data).filter((key) => typeof data[key] === "string");
        const resolved = fillQualitySelect(qualitySelect, qualities, preferredQuality);
        activeQuality = resolved;
        if (preferredQuality && resolved !== preferredQuality) {
          const url = buildStreamUrl(videoId, resolved);
          updatePlayerSource(player, source, url, {
            preserveTime: true,
            autoPlay: !player.paused
          });
        }
      })
      .catch(() => {
        activeQuality = fillQualitySelect(qualitySelect, [], preferredQuality);
      });
  };

  const setEpisode = (index, options = {}) => {
    if (!episodes.length) return;
    const nextIndex = Math.max(0, Math.min(index, episodes.length - 1));
    const episode = episodes[nextIndex];
    if (!episode) return;
    currentIndex = nextIndex;
    currentVideoId = episode.videoId;
    currentTitle = episode.title || "Episode";
    autoAdvanceTriggered = false;
    activeQuality = preferredQuality;
    if (title) title.textContent = currentTitle;
    if (overlay) {
      overlay.textContent = "Memuat video...";
      overlay.classList.remove("hidden");
    }
    const url = buildStreamUrl(currentVideoId, activeQuality);
    updatePlayerSource(player, source, url, {
      preserveTime: false,
      autoPlay: options.autoPlay === true
    });
    updateNavState();
    storeEpisodeMeta(currentVideoId, currentTitle, seriesId, currentIndex);
    loadQualities(currentVideoId);
  };

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      setEpisode(currentIndex - 1, { autoPlay: true });
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      setEpisode(currentIndex + 1, { autoPlay: true });
    });
  }

  if (qualitySelect) {
    qualitySelect.addEventListener("change", () => {
      if (!currentVideoId) return;
      preferredQuality = qualitySelect.value;
      activeQuality = preferredQuality;
      if (overlay) {
        overlay.textContent = "Memuat video...";
        overlay.classList.remove("hidden");
      }
      const url = buildStreamUrl(currentVideoId, activeQuality);
      updatePlayerSource(player, source, url, { preserveTime: true, autoPlay: true });
    });
  }

  if (overlay) {
    player.addEventListener("canplay", () => overlay.classList.add("hidden"));
    player.addEventListener("playing", () => overlay.classList.add("hidden"));
    player.addEventListener("waiting", () => overlay.classList.remove("hidden"));
  }

  const triggerAutoNext = () => {
    if (autoAdvanceTriggered) return;
    autoAdvanceTriggered = true;
    if (currentIndex === -1) return;
    if (currentIndex < episodes.length - 1) {
      setEpisode(currentIndex + 1, { autoPlay: true });
      return;
    }
    if (overlay) {
      overlay.textContent = "Episode selesai.";
      overlay.classList.remove("hidden");
    }
  };

  const maybeAutoNext = () => {
    if (autoAdvanceTriggered || currentIndex === -1) return;
    if (player.seeking || player.paused) return;
    const duration = player.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (player.currentTime >= duration - AUTO_NEXT_THRESHOLD_SEC) {
      triggerAutoNext();
    }
  };

  player.addEventListener("ended", triggerAutoNext);

  player.addEventListener("timeupdate", () => {
    if (!currentVideoId) return;
    maybeAutoNext();
    const now = Date.now();
    if (now - lastSave < 5000) return;
    lastSave = now;
    const items = getContinueWatching();
    const next = items.filter((item) => item.videoId !== currentVideoId);
    next.unshift({
      videoId: currentVideoId,
      title: currentTitle || "Episode",
      time: player.currentTime,
      updatedAt: now
    });
    setContinueWatching(next.slice(0, CONTINUE_MAX_ITEMS));
  });

  if (!episodes.length) {
    if (title) title.textContent = "Episode belum tersedia.";
    if (overlay) {
      overlay.textContent = "Episode belum tersedia.";
      overlay.classList.remove("hidden");
    }
    updateNavState();
    if (qualitySelect) qualitySelect.disabled = true;
    return;
  }

  setEpisode(currentIndex, { autoPlay: false });
}

function initSeriesMetaStorage() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-series-id]");
    if (!target) return;
    const id = target.dataset.seriesId;
    const title = target.dataset.seriesTitle || "";
    const poster = target.dataset.seriesPoster || "";
    if (!id) return;
    const meta = getSeriesMeta();
    meta[id] = {
      title,
      poster,
      updatedAt: Date.now()
    };
    setSeriesMeta(meta);
  });
}

function applySeriesMeta() {
  const head = document.querySelector(".series-head");
  const title = document.getElementById("series-title");
  if (!head || !title) return;
  if (title.textContent && title.textContent !== "Memuat judul...") return;
  const id = head.dataset.seriesId;
  if (!id) return;
  const meta = getSeriesMeta();
  const info = meta[id];
  if (!info) return;
  title.textContent = info.title || "Series";
  if (info.poster) {
    const poster = head.querySelector(".series-poster");
    if (poster) {
      poster.style.backgroundImage = `url('${proxyImage(info.poster, 480, 80)}')`;
    }
  }
}

function initLazyBackgrounds() {
  const targets = Array.from(document.querySelectorAll("[data-bg]"));
  if (!targets.length) return;
  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => {
      el.style.backgroundImage = `url('${el.dataset.bg}')`;
    });
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.dataset.bg) {
        el.style.backgroundImage = `url('${el.dataset.bg}')`;
        el.removeAttribute("data-bg");
      }
      obs.unobserve(el);
    });
  }, { rootMargin: "200px" });

  targets.forEach((el) => observer.observe(el));
}

async function initWatchQuality() {
  const head = document.querySelector(".watch-head");
  const player = document.getElementById("player");
  const select = document.getElementById("watch-quality");
  const overlay = document.getElementById("player-overlay");
  if (!head || !player || !select) return;

  const videoId = head.dataset.videoId;
  if (!videoId) return;

  const source = player.querySelector("source");

  select.addEventListener("change", () => {
    const quality = select.value;
    if (overlay) {
      overlay.textContent = "Memuat video...";
      overlay.classList.remove("hidden");
    }
    const url = buildStreamUrl(videoId, quality);
    updatePlayerSource(player, source, url, { preserveTime: true, autoPlay: true });
  });

  try {
    const payload = await fetchWithCache(`/api/stream-info?video_id=${videoId}`);
    const data = payload?.data || payload || {};
    const qualities = Object.keys(data).filter((key) => typeof data[key] === "string");
    fillQualitySelect(select, qualities, select.value);
  } catch (err) {
    fillQualitySelect(select, [], select.value);
  }
}

function initWatchAutoNext() {
  const head = document.querySelector(".watch-head");
  const player = document.getElementById("player");
  const overlay = document.getElementById("player-overlay");
  if (!head || !player) return;

  const videoId = head.dataset.videoId;
  const nextEpisode = getNextEpisodeForVideo(videoId);
  if (!nextEpisode?.videoId) return;

  let autoAdvanceTriggered = false;

  const goNext = () => {
    if (autoAdvanceTriggered) return;
    autoAdvanceTriggered = true;
    if (overlay) {
      overlay.textContent = "Memuat episode berikutnya...";
      overlay.classList.remove("hidden");
    }
    const title = nextEpisode.title || "Episode";
    const url = `/watch/${nextEpisode.videoId}?title=${encodeURIComponent(title)}`;
    window.location.href = url;
  };

  const maybeAutoNext = () => {
    if (autoAdvanceTriggered) return;
    if (player.seeking || player.paused) return;
    const duration = player.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (player.currentTime >= duration - AUTO_NEXT_THRESHOLD_SEC) {
      goNext();
    }
  };

  player.addEventListener("ended", goNext);
  player.addEventListener("timeupdate", maybeAutoNext);
}

function initThemeToggle() {
  const toggle = document.querySelector("[data-action='theme-toggle']");
  if (!toggle) return;

  const applyTheme = (theme) => {
    document.body.dataset.theme = theme;
  };

  const saved = localStorage.getItem("theme") || "cinema";
  applyTheme(saved);

  toggle.addEventListener("click", () => {
    const next = document.body.dataset.theme === "day" ? "cinema" : "day";
    localStorage.setItem("theme", next);
    applyTheme(next);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initHomePagination();
  initPlayerOverlay();
  initHeroCarousel();
  initContinueWatching();
  initWatchHistory();
  applyWatchMeta();
  initWatchQuality();
  initWatchAutoNext();
  initSeriesPlayer();
  initSeriesMetaStorage();
  applySeriesMeta();
  initLazyBackgrounds();
  initThemeToggle();
});
