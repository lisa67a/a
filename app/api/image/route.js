export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("url");
    if (!source) {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!source.startsWith("http://") && !source.startsWith("https://")) {
      return new Response(JSON.stringify({ error: "Invalid url" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isHeic = /\.heic(\?|$)/i.test(source) || /\.heif(\?|$)/i.test(source);
    const width = Number.parseInt(searchParams.get("w") || "", 10);
    const quality = Number.parseInt(searchParams.get("q") || "", 10);
    const hasWidth = Number.isFinite(width) && width > 0;
    const hasQuality = Number.isFinite(quality) && quality > 0;
    const cacheHeader =
      "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";

    if (!isHeic && !hasWidth && !hasQuality) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: source,
          "Cache-Control": cacheHeader
        }
      });
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

    return new Response(null, {
      status: 302,
      headers: {
        Location: url.toString(),
        "Cache-Control": cacheHeader
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
