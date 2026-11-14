"use client";

import { useEffect, useState } from "react";
import { detailsKey, useShelf } from "./store";
import type { BookDetails } from "./types";

const WEEK = 7 * 86_400_000;

/**
 * "About this book" for any book, from the cache when it's fresh, otherwise from /api/book.
 * When the book is on the shelf, missing facts (cover, Open Library link, free text) are filled in.
 */
export function useDetails(b: { olKey?: string | null; title: string; author: string } | null, bookId?: string) {
  const key = b ? detailsKey(b) : "";
  const cached = useShelf((s) => (key ? s.details[key] : undefined));
  const save = useShelf((s) => s.saveDetails);
  const [state, setState] = useState<{ key: string; phase: "loading" | "error" }>({ key: "", phase: "loading" });
  const cachedAt = cached?.at ?? 0;

  useEffect(() => {
    if (!b || Date.now() - cachedAt < WEEK) return;
    const ctrl = new AbortController();
    const params = new URLSearchParams({ title: b.title, author: b.author === "Unknown author" ? "" : b.author });
    if (b.olKey) params.set("key", b.olKey);
    fetch(`/api/book?${params}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<BookDetails>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => save(key, d, bookId))
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setState({ key, phase: "error" });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the book or its cache entry changes
  }, [key, cachedAt]);

  const details: BookDetails | null = cached ?? null;
  const phase = details ? "done" : state.key === key && state.phase === "error" ? "error" : "loading";
  return { details, phase } as const;
}
