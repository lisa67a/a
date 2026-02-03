"use client";

import { useSearchParams } from "next/navigation";

export default function SearchInline() {
  const params = useSearchParams();
  const value = params?.get("q") || "";

  return (
    <form className="search-inline" action="/search" method="get">
      <input type="text" name="q" placeholder="Cari series..." defaultValue={value} />
      <button type="submit">Cari</button>
    </form>
  );
}
