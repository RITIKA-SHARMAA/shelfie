"use client";

import { useEffect, useState } from "react";
import type { BookResult } from "./types";

export type SearchPhase = "idle" | "loading" | "done" | "error";

/** Search Open Library as you type, after a short pause so the API isn't called on every key. */
export function useBookSearch(query: string, delay = 350) {
  const [results, setResults] = useState<BookResult[]>([]);
  const [phase, setPhase] = useState<SearchPhase>("idle");

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setPhase("loading");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { results: BookResult[] };
        setResults(data.results);
        setPhase("done");
      } catch (err) {
        if ((err as Error).name !== "AbortError") setPhase("error");
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, delay]);

  return { results, phase, active: query.trim().length >= 2 } as const;
}
