import BodyAttr from "@/components/BodyAttr";
import { fetchJson } from "@/lib/upstream";
import { buildImageProxy, pickList } from "@/lib/normalize";

export const dynamic = "force-dynamic";

function seriesId(item) {
  return item?.series_id || item?.id || item?.slug || "";
}

function seriesTitle(item) {
  return item?.title || item?.name || "Untitled";
}

function seriesPoster(item) {
  return item?.poster || item?.thumbnail || item?.cover || "";
}

export default async function HomePage({ searchParams }) {
  const offset = Number(searchParams?.offset || 0);
  let list = [];
  try {
    const payload = await fetchJson(
      "/api/home",
      { offset },
      { cacheTtlMs: 5 * 60 * 1000 }
    );
    list = pickList(payload);
  } catch (err) {
    list = [];
  }

  const heroSlides = list.slice(0, 5);
  const spotlight = list[0];
  const recommended = list.filter((item) => item?.type === "recommended");
  const discovery = list.filter((item) => item?.type === "discovery");

  return (
    <>
      <BodyAttr page="home" />
      <section className="hero">
        <div className="hero-text">
          <span className="pill">Streaming katalog drama</span>
          <h1>Kurasi cerita, streaming tanpa jeda</h1>
          <p>
            Jelajahi ratusan series, pilih episode favorit, dan nikmati player HTML5
            yang responsif di semua perangkat.
          </p>
        </div>
        <div className="hero-stack">
          {heroSlides.length ? (
            <div className="hero-carousel" data-action="hero-carousel">
              {heroSlides.map((item, index) => {
                const id = seriesId(item);
                const title = seriesTitle(item) || "Spotlight";
                const poster = seriesPoster(item);
                const posterUrl = poster ? buildImageProxy(poster, 1200, 80) : "";
                return (
                  <a
                    key={`${id}-${index}`}
                    className={`spotlight-card ${index === 0 ? "active" : "lazy-bg"}`}
                    data-series-id={id}
                    data-series-title={title}
                    data-series-poster={poster}
                    href={`/series/${id}`}
                    style={index === 0 ? { backgroundImage: `url('${posterUrl}')` } : undefined}
                    data-bg={index === 0 ? undefined : posterUrl}
                  >
                    <div className="spotlight-overlay">
                      <span className="tag">Spotlight</span>
                      <h2>{title}</h2>
                      <span className="cta">Lihat detail</span>
                    </div>
                  </a>
                );
              })}
              <div className="carousel-dots">
                {heroSlides.map((_, index) => (
                  <button
                    key={`dot-${index}`}
                    className={`dot ${index === 0 ? "active" : ""}`}
                    type="button"
                    data-dot={index}
                  ></button>
                ))}
              </div>
            </div>
          ) : spotlight ? (
            (() => {
              const id = seriesId(spotlight);
              const title = seriesTitle(spotlight) || "Spotlight";
              const poster = seriesPoster(spotlight);
              const posterUrl = poster ? buildImageProxy(poster, 1200, 80) : "";
              return (
                <a
                  className="spotlight-card active"
                  data-series-id={id}
                  data-series-title={title}
                  data-series-poster={poster}
                  href={`/series/${id}`}
                  style={{ backgroundImage: `url('${posterUrl}')` }}
                >
                  <div className="spotlight-overlay">
                    <span className="tag">Spotlight</span>
                    <h2>{title}</h2>
                    <span className="cta">Lihat detail</span>
                  </div>
                </a>
              );
            })()
          ) : null}
          <div className="stat-card">
            <strong>{list.length}+ </strong>
            <span>Series baru hari ini</span>
          </div>
        </div>
      </section>

      <section className="rail" id="continue-rail">
        <div className="rail-head">
          <h2>Continue Watching</h2>
          <span>Lanjutkan episode terakhir</span>
        </div>
        <div className="rail-track" id="continue-track">
          <div className="state">Belum ada riwayat tontonan.</div>
        </div>
      </section>

      {recommended.length ? (
        <section className="rail">
          <div className="rail-head">
            <h2>Recommended</h2>
            <span>Kurasi untuk kamu</span>
          </div>
          <div className="rail-track">
            {recommended.map((item) => {
              const id = seriesId(item);
              const title = seriesTitle(item);
              const poster = seriesPoster(item);
              const posterUrl = poster ? buildImageProxy(poster, 480, 80) : "";
              return (
                <a
                  key={id}
                  className="card card--tall"
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
          </div>
        </section>
      ) : null}

      {discovery.length ? (
        <section className="rail">
          <div className="rail-head">
            <h2>Discovery</h2>
            <span>Temukan favorit baru</span>
          </div>
          <div className="rail-track">
            {discovery.map((item) => {
              const id = seriesId(item);
              const title = seriesTitle(item);
              const poster = seriesPoster(item);
              const posterUrl = poster ? buildImageProxy(poster, 480, 80) : "";
              return (
                <a
                  key={id}
                  className="card card--tall"
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
          </div>
        </section>
      ) : null}

      <section className="grid" id="home-grid" data-offset={list.length || offset}>
        {!list.length ? (
          <div className="state">Tidak ada data.</div>
        ) : (
          list.map((item, index) => {
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
          })
        )}
      </section>

      <div className="load-wrap">
        <button className="load-more" data-action="load-home">
          Muat lagi
        </button>
        <div className="status" id="home-status"></div>
      </div>
    </>
  );
}
