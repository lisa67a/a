const express = require("express");
const { fetchJson } = require("../upstream");

const router = express.Router();

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

function setPageCache(res) {
  res.set(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=600"
  );
}

router.get("/", async (req, res, next) => {
  try {
    const offset = Number(req.query.offset || 0);
    const payload = await fetchJson(
      "/api/home",
      { offset },
      { cacheTtlMs: 5 * 60 * 1000 }
    );
    const list = pickList(payload);
    const heroPoster =
      list?.[0]?.poster || list?.[0]?.thumbnail || list?.[0]?.cover || "";
    const preloadImage = heroPoster
      ? `/api/image?url=${encodeURIComponent(heroPoster)}&w=1200&q=80`
      : "";
    setPageCache(res);
    res.render("layout", {
      title: "Dramahub",
      body: "home",
      data: { list, offset: list.length || offset, preloadImage, page: "home" }
    });
  } catch (err) {
    next(err);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const q = req.query.q || "";
    let list = [];
    if (q) {
      const payload = await fetchJson(
        "/api/search",
        { q },
        { cacheTtlMs: 2 * 60 * 1000 }
      );
      list = pickList(payload);
    }
    setPageCache(res);
    res.render("layout", {
      title: q ? `Search: ${q}` : "Search",
      body: "search",
      data: { list, q, page: "search" }
    });
  } catch (err) {
    next(err);
  }
});

router.get("/series/:id", async (req, res, next) => {
  try {
    const payload = await fetchJson(
      "/api/info",
      { series_id: req.params.id },
      { cacheTtlMs: 10 * 60 * 1000 }
    );
    const series = payload?.data || payload?.series || payload || {};
    const rawEpisodes =
      series?.episodes || payload?.episodes || payload?.episode_list || [];
    const seen = new Set();
    const episodes = rawEpisodes
      .filter((ep) => {
        const videoId = ep?.video_id || ep?.id || ep?.slug;
        if (!videoId || seen.has(videoId)) return false;
        seen.add(videoId);
        return true;
      })
      .sort((a, b) => {
        const aIndex = Number(a.index || a.no || a.number);
        const bIndex = Number(b.index || b.no || b.number);
        if (!Number.isNaN(aIndex) && !Number.isNaN(bIndex)) {
          return aIndex - bIndex;
        }
        const aTitle = a.title || a.name || "";
        const bTitle = b.title || b.name || "";
        return aTitle.localeCompare(bTitle);
      });
    const pageTitle =
      series.title && series.title !== "Unknown"
        ? series.title
        : series.name && series.name !== "Unknown"
          ? series.name
          : "Series";
    setPageCache(res);
    res.render("layout", {
      title: pageTitle,
      body: "series",
      data: { series, episodes, seriesId: req.params.id, page: "series" }
    });
  } catch (err) {
    next(err);
  }
});

router.get("/watch/:video_id", (req, res) => {
  const title = req.query.title || "Watch";
  setPageCache(res);
  res.render("layout", {
    title,
    body: "watch",
    data: { videoId: req.params.video_id, title, page: "watch" }
  });
});

module.exports = router;
