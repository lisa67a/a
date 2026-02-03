import { fetchJson } from "@/lib/upstream";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    if (!q) {
      return new Response(JSON.stringify({ error: "Missing q parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await fetchJson(
      "/api/search",
      { q },
      { cacheTtlMs: 2 * 60 * 1000 }
    );

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=120"
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
