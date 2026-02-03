"use client";

import { useEffect } from "react";

export default function BodyAttr({ page }) {
  useEffect(() => {
    if (!page) return undefined;
    document.body.dataset.page = page;
    return () => {
      if (document.body.dataset.page === page) {
        delete document.body.dataset.page;
      }
    };
  }, [page]);

  return null;
}
