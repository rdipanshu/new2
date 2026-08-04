import { useEffect, useState } from "react";
import { api } from "../lib/api";

const trackVisit = (pageId) => {
  const key = `visit_${pageId}`;
  const last = Number(sessionStorage.getItem(key) || 0);
  if (Date.now() - last < 15000) return;
  sessionStorage.setItem(key, String(Date.now()));
  api.post("/analytics/visit", { page: pageId }).catch(() => {});
};

export function usePage(pageId) {
  const [page, setPage] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get(`/pages/${pageId}`).then((r) => alive && setPage(r.data)).catch(() => {});
    trackVisit(pageId);
    return () => { alive = false; };
  }, [pageId]);
  return page;
}
