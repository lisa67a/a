import { fetchJson } from "@/lib/upstream";

export const runtime = "nodejs";

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

    const data = await fetchJson(
      "/api/stream",
      { video_id: videoId },
      { cacheTtlMs: 5 * 60 * 1000 }
    );

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=120, s-maxage=600, stale-while-revalidate=600"
      }
    });
  } catch (err) {
    const status = err?.status || 500;
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }
}
