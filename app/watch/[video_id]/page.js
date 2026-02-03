import BodyAttr from "@/components/BodyAttr";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  const title = searchParams?.title || "Watch";
  return { title };
}

export default function WatchPage({ params, searchParams }) {
  const title = searchParams?.title || "Watch";

  return (
    <>
      <BodyAttr page="watch" />
      <section className="watch-head" data-video-id={params.video_id} data-title={title}>
        <div className="watch-meta">
          <div className="watch-poster" id="watch-poster"></div>
          <div>
            <h1 id="watch-title">{title}</h1>
          </div>
        </div>
        <div className="watch-actions">
          <div className="quality-picker">
            <label htmlFor="watch-quality">Resolusi</label>
            <select id="watch-quality" className="quality-select">
              <option value="">Auto</option>
            </select>
          </div>
          <a className="back-link" href="/">
            Kembali
          </a>
        </div>
      </section>

      <section className="player-wrap" data-video-id={params.video_id} data-title={title}>
        <video id="player" controls autoPlay playsInline>
          <source src={`/api/stream?video_id=${params.video_id}`} type="video/mp4" />
          Browser kamu tidak mendukung video HTML5.
        </video>
        <div className="player-overlay" id="player-overlay">
          Memuat video...
        </div>
      </section>
    </>
  );
}
