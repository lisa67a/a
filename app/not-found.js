import BodyAttr from "@/components/BodyAttr";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <>
      <BodyAttr page="error" />
      <section className="page-head">
        <h1>Halaman tidak ditemukan</h1>
        <p>Coba kembali ke beranda.</p>
        <a className="back-link" href="/">
          Kembali ke beranda
        </a>
      </section>
    </>
  );
}
