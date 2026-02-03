import BodyAttr from "@/components/BodyAttr";
import { fetchJson } from "@/lib/upstream";
import { buildImageProxy } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const title = params?.id ? `Series ${params.id}` : "Series";
  return { title };
}

function sortEpisodes(rawEpisodes) {
  const seen = new Set();
  return rawEpisodes
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
}

export default async function SeriesPage({ params }) {
  let series = {};
  let episodes = [];
  try {
    const payload = await fetchJson(
      "/api/info",
      { series_id: params.id },
      { cacheTtlMs: 10 * 60 * 1000 }
    );
    series = payload?.data || payload?.series || payload || {};
    const rawEpisodes =
      series?.episodes || payload?.episodes || payload?.episode_list || [];
    episodes = sortEpisodes(rawEpisodes);
  } catch (err) {
    series = {};
    episodes = [];
  }

  const poster = series.poster || series.thumbnail || series.cover || "";
  const posterUrl = poster ? buildImageProxy(poster, 480, 80) : "";
  const title = series.title || series.name || "Series";
  const synopsis = series.synopsis || series.description || "";
  const displayTitle = title && title !== "Unknown" ? title : "";

  return (
    <>
      <BodyAttr page="series" />
      <section
        className="series-head"
        data-series-id={params.id || series.series_id || series.id || ""}
        data-series-title={title}
        data-series-poster={poster}
      >
        <div
          className="series-poster"
          style={posterUrl ? { backgroundImage: `url('${posterUrl}')` } : undefined}
        ></div>
        <div className="series-info">
          <h1 id="series-title">{displayTitle || "Memuat judul..."}</h1>
          <p>{synopsis}</p>
        </div>
      </section>

      <section className="episodes">
        <h2>Daftar Episode</h2>
        <div className="series-player">
          <div className="series-player-meta">
            <a className="back-link back-link--compact" href="/">Kembali</a>
            <div className="quality-picker">
              <label htmlFor="series-quality">Resolusi</label>
              <select id="series-quality" className="quality-select">
                <option value="">Auto</option>
              </select>
            </div>
          </div>
          <video id="series-player" controls playsInline poster={posterUrl}>
            <source id="series-player-source" src="" type="video/mp4" />
            Browser kamu tidak mendukung video HTML5.
          </video>
          <div className="player-overlay" id="series-player-overlay">
            Pilih episode untuk memutar.
          </div>
        </div>
        <div className="episode-footer">
          <button type="button" className="series-nav" data-action="episode-prev">
            Prev
          </button>
          <div className="episode-info" id="series-episode-title">
            Memuat episode...
          </div>
          <button type="button" className="series-nav" data-action="episode-next">
            Next
          </button>
        </div>
        {!episodes.length ? <div className="state">Episode belum tersedia.</div> : null}
        <script
          type="application/json"
          id="series-episodes-data"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(episodes) }}
        ></script>
      </section>
    </>
  );
}
