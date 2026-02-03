const express = require("express");
const { Readable } = require("stream");
const { fetchJson } = require("../upstream");

const router = express.Router();

router.get("/ping", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, time: new Date().toISOString() });
});

router.get("/home", async (req, res, next) => {
  try {
    const data = await fetchJson(
      "/api/home",
      { offset: req.query.offset },
      { cacheTtlMs: 5 * 60 * 1000 }
    );
    res.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=300"
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    if (!req.query.q) {
      return res.status(400).json({ error: "Missing q parameter" });
    }
    const data = await fetchJson(
      "/api/search",
      { q: req.query.q },
      { cacheTtlMs: 2 * 60 * 1000 }
    );
    res.set(
      "Cache-Control",
      "public, max-age=30, s-maxage=120, stale-while-revalidate=120"
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/info", async (req, res, next) => {
  try {
    if (!req.query.series_id) {
      return res.status(400).json({ error: "Missing series_id parameter" });
    }
    const data = await fetchJson(
      "/api/info",
      { series_id: req.query.series_id },
      { cacheTtlMs: 10 * 60 * 1000 }
    );
    res.set(
      "Cache-Control",
      "public, max-age=120, s-maxage=600, stale-while-revalidate=600"
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

function pickStreamUrl(payload, quality) {
  const data = payload?.data || payload;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (quality && data[quality]) return data[quality];
  const qualityOrder = ["1080p", "720p", "480p", "360p", "240p"];
  for (const key of qualityOrder) {
    if (data[key]) return data[key];
  }
  const values = Object.values(data).filter((value) => typeof value === "string");
  return values[0] || null;
}

router.get("/stream-info", async (req, res, next) => {
  try {
    if (!req.query.video_id) {
      return res.status(400).json({ error: "Missing video_id parameter" });
    }
    const data = await fetchJson(
      "/api/stream",
      { video_id: req.query.video_id },
      { cacheTtlMs: 5 * 60 * 1000 }
    );
    res.set(
      "Cache-Control",
      "public, max-age=120, s-maxage=600, stale-while-revalidate=600"
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/image", async (req, res, next) => {
  try {
    const source = req.query.url;
    if (!source || typeof source !== "string") {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    if (!source.startsWith("http://") && !source.startsWith("https://")) {
      return res.status(400).json({ error: "Invalid url" });
    }

    const isHeic = /\.heic(\?|$)/i.test(source) || /\.heif(\?|$)/i.test(source);
    const width = Number.parseInt(req.query.w, 10);
    const quality = Number.parseInt(req.query.q, 10);
    const hasWidth = Number.isFinite(width) && width > 0;
    const hasQuality = Number.isFinite(quality) && quality > 0;
    const cacheHeader =
      "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";

    if (!isHeic && !hasWidth && !hasQuality) {
      res.setHeader("Cache-Control", cacheHeader);
      return res.redirect(302, source);
    }

    const url = new URL("https://images.weserv.nl/");
    url.searchParams.set("url", source);
    if (hasWidth) {
      url.searchParams.set("w", String(Math.min(width, 1920)));
    }
    if (hasQuality) {
      const clamped = Math.min(Math.max(quality, 30), 90);
      url.searchParams.set("q", String(clamped));
    }
    if (isHeic) {
      url.searchParams.set("output", "jpg");
    }

    res.setHeader("Cache-Control", cacheHeader);
    return res.redirect(302, url.toString());
  } catch (err) {
    next(err);
  }
});

router.get("/stream", async (req, res, next) => {
  try {
    if (!req.query.video_id) {
      return res.status(400).json({ error: "Missing video_id parameter" });
    }

    const streamMeta = await fetchJson("/api/stream", {
      video_id: req.query.video_id
    });
    const streamUrl = pickStreamUrl(streamMeta, req.query.quality);
    if (!streamUrl) {
      return res.status(502).json({ error: "Stream url not found" });
    }

    const headers = {};
    if (req.headers.range) {
      headers.range = req.headers.range;
    }
    headers["user-agent"] = req.headers["user-agent"] || "Mozilla/5.0";
    headers.accept = req.headers.accept || "*/*";

    const upstream = await fetch(streamUrl, { headers });
    res.status(upstream.status);
    for (const [key, value] of upstream.headers.entries()) {
      res.setHeader(key, value);
    }
    if (req.query.download === "1") {
      const baseName = (req.query.title || req.query.video_id || "video")
        .toString()
        .replace(/[^\w-]+/g, "_");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"${baseName}.mp4\"`
      );
    }

    if (!upstream.body) {
      res.end();
      return;
    }

    const nodeStream = Readable.fromWeb(upstream.body);
    nodeStream.pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
