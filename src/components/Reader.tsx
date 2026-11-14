"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { bookActions } from "@/lib/actions";
import { errorText } from "@/lib/errors";
import { gutenbergPage, pageOf, paginate, type BookText } from "@/lib/gutenberg";
import { useShelf } from "@/lib/store";
import { useUI } from "@/lib/ui";

// Texts are large, so they're kept in memory for the visit rather than in localStorage.
const cache = new Map<string, BookText>();
const SIZES = [17, 19, 21, 24];

function readSize(): number {
  try {
    const n = Number(localStorage.getItem("shelfie-reader-size"));
    return SIZES.includes(n) ? n : 19;
  } catch {
    return 19;
  }
}

/** A quiet full-screen reader for public-domain books. Pages fit the screen; your place is saved. */
export function Reader({ id }: { id: string }) {
  const book = useShelf((s) => s.books.find((b) => b.id === id));
  const saved = useShelf((s) => s.readerPos[id]);
  const setPos = useShelf((s) => s.setReaderPos);
  const update = useShelf((s) => s.updateBook);
  const close = useUI((s) => s.closeReader);
  const gid = book?.gutenbergId ?? null;

  const [text, setText] = useState<BookText | null>(gid ? (cache.get(gid) ?? null) : null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState(readSize);
  const [box, setBox] = useState({ w: 640, h: 560 });
  const [anchor, setAnchor] = useState<number | null>(saved ?? null);
  const area = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);

  // Fetch the text once per visit.
  useEffect(() => {
    if (!gid || text) return;
    const ctrl = new AbortController();
    fetch(`/api/text?id=${gid}`, { signal: ctrl.signal })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error ?? "text_failed");
        return data as BookText;
      })
      .then((t) => {
        cache.set(gid, t);
        setText(t);
      })
      .catch((err: Error) => err.name !== "AbortError" && setError(errorText(err.message)));
    return () => ctrl.abort();
  }, [gid, text]);

  // Measure the page area so a page fills the screen without scrolling.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  const budget = useMemo(() => {
    const perLine = Math.max(24, Math.min(680, box.w) / (size * 0.5));
    const lines = Math.max(8, box.h / (size * 1.65));
    return Math.round(perLine * lines * 0.8);
  }, [box, size]);
  const pages = useMemo(() => (text ? paginate(text, budget) : []), [text, budget]);
  const totals = useMemo(() => {
    if (!text) return { prefix: [0], total: 1 };
    const prefix = [0];
    for (const p of text.paragraphs) prefix.push(prefix[prefix.length - 1] + p.length);
    return { prefix, total: prefix[prefix.length - 1] || 1 };
  }, [text]);

  // A book read elsewhere opens near its saved page; otherwise at the first chapter.
  const resume = useMemo(() => {
    if (!text) return 0;
    if (!book?.pages || !book.currentPage || book.status === "finished") return text.start;
    const target = (book.currentPage / book.pages) * totals.total;
    const i = totals.prefix.findIndex((c) => c >= target);
    return Math.max(text.start, i < 0 ? text.start : i);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the text first arrives
  }, [text, totals]);
  const start = anchor ?? resume;

  // Remember that the book was opened, so the dialog offers "Continue reading".
  useEffect(() => {
    if (text && saved === undefined) setPos(id, resume);
  }, [text, saved, id, setPos, resume]);
  const page = pages.length ? Math.min(pageOf(pages, start), pages.length - 1) : 0;
  const current = pages[page];
  const pct = current ? Math.round((totals.prefix[current.from] / totals.total) * 100) : 0;
  const atEnd = pages.length > 0 && page === pages.length - 1;

  const go = useCallback(
    (to: number) => {
      const p = pages[Math.max(0, Math.min(pages.length - 1, to))];
      if (!p || !book) return;
      setAnchor(p.from);
      setPos(book.id, p.from);
      // Move the book's progress forward to match where you are in the text.
      if (book.status === "reading" && book.pages) {
        const pageNo = Math.round((totals.prefix[p.from] / totals.total) * book.pages);
        if (pageNo > book.currentPage) update(book.id, { currentPage: pageNo });
      }
      area.current?.scrollTo({ top: 0 });
    },
    [pages, book, setPos, update, totals],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "SELECT") return;
      if (e.key === "Escape") close();
      if (["ArrowRight", "PageDown"].includes(e.key)) go(page + 1);
      if (["ArrowLeft", "PageUp"].includes(e.key)) go(page - 1);
    };
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, page, close]);

  const changeSize = (dir: 1 | -1) => {
    const next = SIZES[Math.max(0, Math.min(SIZES.length - 1, SIZES.indexOf(size) + dir))];
    setSize(next);
    if (current) setAnchor(current.from);
    try {
      localStorage.setItem("shelfie-reader-size", String(next));
    } catch {
      /* private mode: the size just isn't remembered */
    }
  };

  if (!book) return null;
  const chapter = text ? [...text.headings].reverse().find((h) => h <= (current?.from ?? 0)) : undefined;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Reading ${book.title}`}
      className="fixed inset-0 z-[60] flex flex-col bg-paper text-ink"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25 }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 60) go(page + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-8">
        <button
          type="button"
          onClick={close}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-2 text-sm text-ink hover:bg-ground"
        >
          <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          Shelf
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="m-0 truncate font-serif text-xl">{book.title}</p>
          <p className="m-0 truncate text-xs text-label">{book.author}</p>
        </div>
        {text && text.headings.length > 1 && (
          <label className="hidden items-center gap-2 text-xs text-label sm:flex">
            <span className="sr-only">Jump to chapter</span>
            <select
              value={chapter ?? ""}
              onChange={(e) => go(pageOf(pages, Number(e.target.value)))}
              className="h-9 max-w-[180px] cursor-pointer rounded-full border border-line-strong bg-paper px-3 text-[13px] text-ink"
            >
              {chapter === undefined && <option value="">Beginning</option>}
              {text.headings.map((h) => (
                <option key={h} value={h}>
                  {text.paragraphs[h].slice(0, 40)}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1" role="group" aria-label="Text size">
          <button
            type="button"
            aria-label="Smaller text"
            onClick={() => changeSize(-1)}
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-line-strong bg-transparent text-ink"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            aria-label="Larger text"
            onClick={() => changeSize(1)}
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-line-strong bg-transparent text-ink"
          >
            <Plus size={14} />
          </button>
        </div>
      </header>

      <div ref={area} className="relative min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:py-12">
        {error ? (
          <div className="mx-auto max-w-[520px] text-center">
            <p className="m-0 font-serif text-2xl">{error}</p>
            {gid && (
              <a href={gutenbergPage(gid)} target="_blank" rel="noreferrer" className="link mt-3 inline-block text-sm">
                Read it on Project Gutenberg ↗
              </a>
            )}
          </div>
        ) : !text ? (
          <div className="mx-auto max-w-[680px] space-y-3" aria-label="Loading the book">
            <p className="m-0 mb-6 text-sm text-label">Fetching the book from Project Gutenberg…</p>
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="shimmer h-4" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
            ))}
          </div>
        ) : (
          <motion.article
            key={`${page}-${size}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="mx-auto max-w-[680px] font-serif text-[#2f2922]"
            style={{ fontSize: size, lineHeight: 1.65 }}
          >
            {current?.items.map((it, i) =>
              it.heading ? (
                <h2
                  key={i}
                  className="m-0 mt-2 mb-6 text-center font-serif font-medium tracking-[0.04em]"
                  style={{ fontSize: size * 1.25 }}
                >
                  {it.text}
                </h2>
              ) : (
                <p key={i} className="m-0 mb-[0.9em] [text-wrap:pretty]">
                  {it.text}
                </p>
              ),
            )}
            {atEnd && (
              <div className="mt-10 border-t border-line pt-6 text-center font-sans">
                <p className="m-0 font-serif text-2xl">The end.</p>
                {book.status !== "finished" && (
                  <button
                    type="button"
                    onClick={() => bookActions.changeStatus(book.id, "finished")}
                    className="mt-4 h-11 cursor-pointer rounded-full border-0 bg-ink px-6 text-sm font-semibold text-ground"
                  >
                    Mark as finished
                  </button>
                )}
              </div>
            )}
          </motion.article>
        )}
      </div>

      <footer className="flex items-center gap-4 border-t border-line px-4 py-3 sm:px-8">
        <button
          type="button"
          aria-label="Previous page"
          disabled={!text || page === 0}
          onClick={() => go(page - 1)}
          className="grid size-11 cursor-pointer place-items-center rounded-full border border-line-strong bg-transparent text-ink disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="h-[3px] bg-line">
            <div className="h-full bg-clay transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="m-0 mt-1.5 text-center text-xs text-label">
            {text ? `Page ${page + 1} of ${pages.length} · ${pct}% · ← → to turn pages` : " "}
          </p>
        </div>
        <button
          type="button"
          aria-label="Next page"
          disabled={!text || atEnd}
          onClick={() => go(page + 1)}
          className="grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-ink text-ground disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </footer>
    </motion.div>
  );
}
