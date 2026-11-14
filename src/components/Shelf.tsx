"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { fitShelf } from "@/lib/shelfFit";
import { spineLook } from "@/lib/spine";
import { progressPct } from "@/lib/stats";
import { shelfOrder } from "@/lib/store";
import { STATUS_ORDER, type Book, type Status } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { BookCover } from "./BookCover";
import { Pot, Vase } from "./Decor";

const BOOK_AREA = 240;
const FACE_OUT = 144; // cover width plus its margin
// Vase, pot, the gaps beside them and the shelf's side padding. Phones skip the vase and pot.
const DECOR = 62 + 70 + 24 * 2 + 40 * 2;
const DECOR_NARROW = 16 * 2;
const GROUP_META: Record<Status, { label: string; dot: string }> = {
  reading: { label: "Reading", dot: "var(--color-clay)" },
  want: { label: "Want to read", dot: "var(--color-sage)" },
  finished: { label: "Finished", dot: "var(--color-ink)" },
};

const drop = {
  initial: { y: -160, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -40, opacity: 0 },
  transition: { type: "spring" as const, stiffness: 260, damping: 18 },
};

function Ribbon({ left = "50%" }: { left?: string }) {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-3.5 h-[30px] w-[5px] -translate-x-1/2 bg-clay [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]"
      style={{ left }}
    />
  );
}

function Spine({ book, dim, first, lean }: { book: Book; dim: boolean; first: boolean; lean: boolean }) {
  const openBook = useUI((s) => s.openBook);
  const look = spineLook(book);
  const pct = progressPct(book);
  const label = `${book.title} by ${book.author}, ${book.status === "reading" ? `${pct}% read` : book.status === "want" ? "want to read" : "finished"}`;

  return (
    <motion.button
      type="button"
      layout
      {...drop}
      whileHover={{ y: -10 }}
      onClick={() => openBook(book.id)}
      aria-label={label}
      title={book.title}
      className={`relative flex shrink-0 cursor-pointer items-center justify-center rounded-t-[2px] border-0 px-0 pt-3 ${book.status === "want" ? "pb-3" : "pb-7"}`}
      style={{
        width: look.width,
        height: look.height,
        background: look.color,
        color: look.ink,
        opacity: dim ? 0.22 : 1,
        rotate: lean ? 8 : 0,
        transformOrigin: "bottom left",
        boxShadow: book.status === "want" ? "inset 0 0 0 1px rgba(43,38,32,0.10)" : "inset -2px 0 0 rgba(0,0,0,0.08)",
      }}
    >
      {/* Padding keeps the title clear of the tick or progress line; long titles end in "…". */}
      <span className="max-h-full overflow-hidden text-[11px] tracking-[0.08em] text-ellipsis whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
        {book.title}
      </span>
      {book.status === "reading" && (
        <>
          <Ribbon />
          <span aria-hidden="true" className="absolute right-1.5 bottom-2 left-1.5 h-[3px] bg-white/35">
            <span className="block h-full" style={{ width: `${pct}%`, background: look.ink }} />
          </span>
        </>
      )}
      {book.status === "want" && first && (
        <span className="absolute -top-6 left-0 text-[10px] tracking-[0.12em] whitespace-nowrap text-sage uppercase">Up next</span>
      )}
      {book.status === "finished" && (
        <span
          aria-hidden="true"
          className="absolute bottom-2 left-1/2 grid size-3.5 -translate-x-1/2 place-items-center rounded-full"
          style={{ background: look.ink }}
        >
          <svg width="8" height="8" viewBox="0 0 12 12">
            <path d="M2 6.5l2.5 2.5L10 3.5" stroke={look.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </motion.button>
  );
}

function FaceOut({ book, dim }: { book: Book; dim: boolean }) {
  const openBook = useUI((s) => s.openBook);
  const pct = progressPct(book);
  return (
    <motion.button
      type="button"
      layout
      {...drop}
      whileHover={{ y: -10 }}
      onClick={() => openBook(book.id)}
      aria-label={`${book.title} by ${book.author}, ${pct}% read`}
      className="relative mr-3.5 shrink-0 cursor-pointer border-0 p-0 shadow-[0_20px_26px_-16px_rgba(60,35,15,0.5)]"
      style={{ opacity: dim ? 0.22 : 1 }}
    >
      <BookCover title={book.title} author={book.author} coverId={book.coverId} width={130} height={196} size="lg" />
      <span aria-hidden="true" className="absolute right-4 bottom-3 left-4 h-[2px] bg-black/20">
        <span className="block h-full bg-ink" style={{ width: `${pct}%` }} />
      </span>
      <Ribbon left="78%" />
    </motion.button>
  );
}

/** The "+N" at the end of a group: more books than fit on the plank. They're all in the Library. */
function More({ status, count }: { status: Status; count: number }) {
  return (
    <Link
      href={`/library?status=${status}`}
      aria-label={`${count} more ${GROUP_META[status].label.toLowerCase()} books in your library`}
      title="See them all in your library"
      className="group relative ml-1 flex h-[150px] w-[26px] shrink-0 items-center justify-center no-underline"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[22px] rounded-t-[2px] border border-dashed border-line-strong bg-paper/60 transition-colors group-hover:border-ink"
      />
      <span className="relative text-[11px] font-semibold tracking-[0.06em] whitespace-nowrap text-muted [writing-mode:vertical-rl] rotate-180 group-hover:text-ink">
        +{count} more
      </span>
    </Link>
  );
}

/** One oak shelf holding the books that fit: reading, then want to read, then finished. The rest wait in the Library. */
export function Shelf({ books, activeTag }: { books: Book[]; activeTag: string | null }) {
  const openAdd = useUI((s) => s.openAdd);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1100);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const groups = useMemo(() => {
    const ordered = shelfOrder(books);
    const all = STATUS_ORDER.map((status) => ({ status, books: ordered.filter((b) => b.status === status) })).filter(
      (g) => g.books.length > 0,
    );
    const counts = fitShelf(
      all.map((g) => ({
        widths: g.books.map((b, i) => (g.status === "reading" && i === 0 ? FACE_OUT : spineLook(b).width)),
      })),
      Math.max(200, width - (width < 640 ? DECOR_NARROW : DECOR)),
    );
    return all.map((g, i) => ({ ...g, shown: g.books.slice(0, counts[i]), hidden: g.books.length - counts[i] }));
  }, [books, width]);

  return (
    <div ref={box} className="shelf-scroll -mx-6 overflow-x-auto px-6 pt-8">
      <div className="relative mx-auto w-max min-w-full">
        {/* the plank runs under everything */}
        <div aria-hidden="true" className="absolute inset-x-0" style={{ top: BOOK_AREA }}>
          <div className="h-3.5 rounded-[2px] bg-oak shadow-[0_24px_40px_-18px_rgba(90,60,30,0.35)]" />
          <div className="mx-px h-[3px] rounded-b-[2px] bg-oak-edge" />
        </div>

        <div className="relative flex items-start justify-center gap-6 px-4 sm:px-10">
          <div className="hidden shrink-0 items-end sm:flex" style={{ height: BOOK_AREA }}>
            <Vase />
          </div>

          {groups.length === 0 ? (
            <div className="flex items-end" style={{ height: BOOK_AREA }}>
              <button
                type="button"
                onClick={() => openAdd()}
                className="mb-0 flex h-[180px] w-[260px] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-line-strong bg-transparent text-sm text-muted hover:text-ink"
              >
                <Plus size={18} strokeWidth={1.6} />
                Add your first book
              </button>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.status} className="flex flex-col">
                <div className="flex items-end gap-[2px]" style={{ height: BOOK_AREA }}>
                  <AnimatePresence initial={false} mode="popLayout">
                    {g.shown.map((b, i) => {
                      const dim = activeTag !== null && !b.tags.includes(activeTag);
                      if (g.status === "reading" && i === 0) return <FaceOut key={b.id} book={b} dim={dim} />;
                      // The very last book on the shelf leans gently against the pot.
                      const lean = g.status === "finished" && g.hidden === 0 && g.shown.length > 3 && i === g.shown.length - 1;
                      return <Spine key={b.id} book={b} dim={dim} first={i === 0} lean={lean} />;
                    })}
                  </AnimatePresence>
                  {g.hidden > 0 && <More status={g.status} count={g.hidden} />}
                </div>
                <div className="h-[17px]" />
                <div className="flex items-center gap-2 pt-3 text-[12px] whitespace-nowrap text-muted">
                  <span className="size-2 rounded-full" style={{ background: GROUP_META[g.status].dot }} />
                  {GROUP_META[g.status].label}
                  <span className="text-label">· {g.books.length}</span>
                </div>
              </div>
            ))
          )}

          <div className="hidden shrink-0 items-end sm:flex" style={{ height: BOOK_AREA }}>
            <Pot />
          </div>
        </div>
      </div>
    </div>
  );
}
