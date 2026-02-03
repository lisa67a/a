import { fetchJson } from "@/lib/upstream";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const offset = searchParams.get("offset");
    const data = await fetchJson(
      "/api/home",
      { offset },
      { cacheTtlMs: 5 * 60 * 1000 }
    );

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300"
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
