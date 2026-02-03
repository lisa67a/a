"use client";

import BodyAttr from "@/components/BodyAttr";

export default function Error({ error, reset }) {
  return (
    <>
      <BodyAttr page="error" />
      <section className="page-head">
        <h1>Terjadi kesalahan</h1>
        <p>{error?.message || "Coba lagi nanti."}</p>
        <div className="load-wrap">
          <button className="load-more" type="button" onClick={() => reset()}>
            Coba lagi
          </button>
        </div>
      </section>
    </>
  );
}
