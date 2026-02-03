const BASE_URL = process.env.UPSTREAM_BASE_URL || "https://dramahubv1.vercel.app";
const CACHE = new Map();
const MAX_CACHE_ENTRIES = 200;

function buildUrl(path, params = {}) {
  const url = new URL(path, BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
}

function getCache(key) {
  const cached = CACHE.get(key);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    CACHE.delete(key);
    return null;
  }
  return cached.value;
}

function setCache(key, value, ttlMs) {
  if (!ttlMs) return;
  CACHE.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (CACHE.size > MAX_CACHE_ENTRIES) {
    const firstKey = CACHE.keys().next().value;
    if (firstKey) CACHE.delete(firstKey);
  }
}

export async function fetchJson(path, params = {}, options = {}) {
  const url = buildUrl(path, params);
  const cacheKey = url.toString();
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const fetchOptions = options.cacheTtlMs
    ? { next: { revalidate: Math.ceil(options.cacheTtlMs / 1000) } }
    : { cache: "no-store" };
  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || "Upstream error");
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  setCache(cacheKey, data, options.cacheTtlMs);
  return data;
}

export async function fetchStream(path, params = {}, headers = {}) {
  const url = buildUrl(path, params);
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || "Upstream error");
    err.status = res.status;
    throw err;
  }
  return res;
}

export function buildUpstreamUrl(path, params = {}) {
  return buildUrl(path, params).toString();
}
