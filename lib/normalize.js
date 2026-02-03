export function pickList(payload) {
  return (
    payload?.results ||
    payload?.data ||
    payload?.items ||
    payload?.list ||
    payload?.series ||
    []
  );
}

export function buildImageProxy(url, width, quality) {
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

export function pickStreamUrl(payload, quality) {
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
