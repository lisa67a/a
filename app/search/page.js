import BodyAttr from "@/components/BodyAttr";
import { fetchJson } from "@/lib/upstream";
import { buildImageProxy, pickList } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  const q = searchParams?.q || "";
  return {
    title: q ? `Search: ${q}` : "Search"
  };
}

function seriesId(item) {
  return item?.series_id || item?.id || item?.slug || "";
}

function seriesTitle(item) {
  return item?.title || item?.name || "Untitled";
}

function seriesPoster(item) {
  return item?.poster || item?.thumbnail || item?.cover || "";
}

export default async function SearchPage({ searchParams }) {
  const q = (searchParams?.q || "").toString();
  let list = [];
  if (q) {
    try {
      const payload = await fetchJson(
        "/api/search",
        { q },
        { cacheTtlMs: 2 * 60 * 1000 }
      );
      list = pickList(payload);
    } catch (err) {
      list = [];
    }
  }

  return (
    <>
      <BodyAttr page="search" />
      <section className="page-head">
        <h1>Search</h1>
        <p>Masukkan judul series untuk menemukan hasil terbaik.</p>
      </section>

      {!q ? (
        <div className="state">Ketik kata kunci di atas untuk mulai mencari.</div>
      ) : !list.length ? (
        <div className="state">Tidak ada hasil untuk &quot;{q}&quot;.</div>
      ) : (
        <section className="grid">
          {list.map((item, index) => {
            const id = seriesId(item);
            const title = seriesTitle(item);
            const poster = seriesPoster(item);
            const posterUrl = poster ? buildImageProxy(poster, 480, 80) : "";
            return (
              <a
                key={`${id}-${index}`}
                className="card"
                data-series-id={id}
                data-series-title={title}
                data-series-poster={poster}
                href={`/series/${id}`}
              >
                <div className="card-poster lazy-bg" data-bg={posterUrl}></div>
                <div className="card-body">
                  <h3>{title}</h3>
                </div>
                <div className="card-overlay">
                  <span>Detail</span>
                </div>
              </a>
            );
          })}
        </section>
      )}
    </>
  );
}
