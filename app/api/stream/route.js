import { fetchJson } from "@/lib/upstream";
import { pickStreamUrl } from "@/lib/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("video_id");
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Missing video_id parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const streamMeta = await fetchJson("/api/stream", { video_id: videoId });
    const streamUrl = pickStreamUrl(streamMeta, searchParams.get("quality"));
    if (!streamUrl) {
      return new Response(JSON.stringify({ error: "Stream url not found" }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }

    const upstreamHeaders = new Headers();
    const range = req.headers.get("range");
    if (range) upstreamHeaders.set("range", range);
    upstreamHeaders.set("user-agent", req.headers.get("user-agent") || "Mozilla/5.0");
    upstreamHeaders.set("accept", req.headers.get("accept") || "*/*");

    const upstream = await fetch(streamUrl, { headers: upstreamHeaders });
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => responseHeaders.set(key, value));

    if (searchParams.get("download") === "1") {
      const baseName = (searchParams.get("title") || videoId || "video")
        .toString()
        .replace(/[^\w-]+/g, "_");
      responseHeaders.set(
        "Content-Disposition",
        `attachment; filename=\"${baseName}.mp4\"`
      );
    }

    responseHeaders.set("Cache-Control", "no-store");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    });
  } catch (err) {
    const status = err?.status || 500;
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }
}
