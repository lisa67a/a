const path = require("path");
const fs = require("fs");
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const apiRoutes = require("./routes/api");
const pageRoutes = require("./routes/pages");

const app = express();
const isProd = process.env.NODE_ENV === "production";
const STATIC_MAX_AGE = isProd ? "30d" : "1h";
const STATIC_CACHE_SECONDS = isProd ? 60 * 60 * 24 * 30 : 60 * 60; // 30d vs 1h
const publicDir = path.join(__dirname, "..", "public");
const clientDistDir = path.join(__dirname, "..", "client", "dist");
const hasClientDist = fs.existsSync(path.join(clientDistDir, "index.html"));
const devProxyTarget =
  !isProd && (process.env.VITE_DEV_SERVER || "http://localhost:5173");
const enableDevProxy =
  !isProd && devProxyTarget && process.env.CLIENT_DEV_PROXY !== "false";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
// Cache compiled views to avoid re-render cost when NODE_ENV isn't set
app.set("view cache", true);

app.use(cors());
app.use(
  compression({
    filter: (req, res) => {
      if (req.originalUrl.startsWith("/api/stream")) return false;
      return compression.filter(req, res);
    }
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  express.static(publicDir, {
    maxAge: STATIC_MAX_AGE,
    setHeaders(res, filePath) {
      if (path.extname(filePath) !== ".html") {
        res.setHeader(
          "Cache-Control",
          `public, max-age=${STATIC_CACHE_SECONDS}, immutable`
        );
      }
    }
  })
);

if (enableDevProxy) {
  app.use(
    "/client",
    createProxyMiddleware({
      target: devProxyTarget,
      changeOrigin: true,
      ws: true,
      logLevel: "warn"
    })
  );
} else if (hasClientDist) {
  app.use(
    "/client",
    express.static(clientDistDir, {
      maxAge: isProd ? "30d" : "1d",
      setHeaders(res, filePath) {
        if (path.extname(filePath) !== ".html") {
          const seconds = isProd ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
          res.setHeader("Cache-Control", `public, max-age=${seconds}, immutable`);
        }
      },
      index: "index.html"
    })
  );

  // SPA fallback so deep links under /client work
  app.get("/client/*", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(path.join(clientDistDir, "index.html"));
  });
}

app.use("/api", apiRoutes);
app.use("/", pageRoutes);

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.status(404).render("layout", {
    title: "Not Found",
    body: "error",
    data: {
      title: "Halaman tidak ditemukan",
      message: "Coba kembali ke beranda."
    }
  });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (req.path.startsWith("/api")) {
    return res.status(status).json({ error: err.message || "Server error" });
  }
  return res.status(status).render("layout", {
    title: "Terjadi kesalahan",
    body: "error",
    data: {
      title: "Terjadi kesalahan",
      message: err.message || "Coba lagi nanti."
    }
  });
});

module.exports = app;
