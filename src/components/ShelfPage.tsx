"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { lastWeek, streak } from "@/lib/journal";
import { countWord, finishedInYear, progressPct, season } from "@/lib/stats";
import { useShelf } from "@/lib/store";
import { shelfTags } from "@/lib/tags";
import { useUI } from "@/lib/ui";
import { GoalRing } from "./GoalRing";
import { Shelf } from "./Shelf";
import { Welcome } from "./Welcome";

const DAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

export function ShelfPage() {
  const onboarded = useShelf((s) => s.onboarded);
  const [welcome, setWelcome] = useState(!onboarded);
  if (welcome) return <Welcome onDone={() => setWelcome(false)} />;
  return <ShelfHome />;
}

function ShelfHome() {
  const books = useShelf((s) => s.books);
  const journal = useShelf((s) => s.journal);
  const isSample = useShelf((s) => s.isSample);
  const clearSample = useShelf((s) => s.clearSample);
  const restoreBooks = useShelf((s) => s.restoreBooks);
  const picks = useShelf((s) => s.picks);
  const openBook = useUI((s) => s.openBook);
  const openInfo = useUI((s) => s.openInfo);
  const openReader = useUI((s) => s.openReader);
  const showToast = useUI((s) => s.showToast);
  const [tag, setTag] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const tags = useMemo(() => shelfTags(books), [books]);
  const finishedThisYear = useMemo(() => finishedInYear(books, year).length, [books, year]);
  const reading = useMemo(() => books.filter((b) => b.status === "reading").sort((a, b) => b.updatedAt - a.updatedAt), [books]);
  const current = reading[0];
  const suggestion = Object.values(picks).sort((a, b) => b.at - a.at)[0]?.items[0];
  const week = useMemo(() => lastWeek(journal), [journal]);
  const days = useMemo(() => streak(journal), [journal]);
  const weekPages = week.reduce((s, d) => s + d.pages, 0);
  const own = books.filter((b) => !b.id.startsWith("sample-")).length;

  const clear = () => {
    const prev = { books, journal };
    clearSample();
    showToast(own ? `Sample books cleared. Your ${own} book${own === 1 ? "" : "s"} stayed.` : "Sample books cleared.", () => {
      restoreBooks(prev.books, prev.journal);
      useShelf.setState({ isSample: true });
    });
  };
  const activeTag = tag && tags.includes(tag) ? tag : null;

  const n = books.length;
  const heading =
    n === 0 ? ["An empty shelf,", "ready for its first book."] : [`${countWord(n)} book${n === 1 ? "" : "s"},`, "one quiet shelf."];

  return (
    <>
      {isSample && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3 text-[13px] text-muted">
          <span>
            Sample books are on your shelf so you can look around.
            {own > 0 ? ` Your ${own} book${own === 1 ? " is" : "s are"} here too.` : ""}
          </span>
          <button type="button" onClick={clear} className="link cursor-pointer border-0 bg-transparent p-0 text-[13px]">
            Remove the sample books{own > 0 ? " (keeps yours)" : ""}
          </button>
        </div>
      )}

      <section className="mt-10 flex flex-wrap items-end justify-between gap-8">
        <div>
          <p className="eyebrow m-0">
            {season(now)} · {year}
          </p>
          <h1 className="m-0 mt-2.5 font-serif text-[44px] leading-none font-medium sm:text-[64px]">
            {heading[0]}
            <br />
            {heading[1]}
          </h1>
        </div>
        <GoalRing done={finishedThisYear} year={year} />
      </section>

      {tags.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center gap-2.5" role="group" aria-label="Filter by tag">
          <span className="eyebrow mr-2">Tags</span>
          {[null, ...tags.slice(0, 9)].map((t) => {
            const on = activeTag === t;
            return (
              <button
                key={t ?? "all"}
                type="button"
                aria-pressed={on}
                onClick={() => setTag(t)}
                className={`h-[34px] cursor-pointer rounded-full border px-4 text-[13px] transition-colors ${on ? "border-ink bg-ink text-ground" : "border-[#cfc4b2] bg-transparent text-[#4a4239] hover:border-ink"}`}
              >
                {t ?? "All"}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <Shelf books={books} activeTag={activeTag} />
        <p className="mt-3 text-center text-xs text-label">
          <span className="sm:hidden">Swipe along the shelf. </span>
          <Link href="/library" className="link border-0">
            Open your library
          </Link>{" "}
          to see every book.
        </p>
      </div>

      <section className="mt-16 flex flex-wrap gap-12 border-t border-line pt-10">
        <div className="min-w-[260px] flex-1">
          <p className="eyebrow m-0">Now reading</p>
          {current ? (
            <>
              <button
                type="button"
                onClick={() => openBook(current.id)}
                className="m-0 mt-2.5 block cursor-pointer border-0 bg-transparent p-0 text-left font-serif text-[28px] text-ink"
              >
                {current.title} <span className="text-label">— {current.author}</span>
              </button>
              <div className="mt-3.5 h-[2px] bg-line">
                <div className="h-[2px] bg-ink transition-[width] duration-700" style={{ width: `${progressPct(current)}%` }} />
              </div>
              <p className="m-0 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                <span>{current.pages ? `Page ${current.currentPage} of ${current.pages}` : "Add the page count to track progress"}</span>
                <button
                  type="button"
                  onClick={() => (current.gutenbergId ? openReader(current.id) : openBook(current.id))}
                  className="link cursor-pointer border-0 bg-transparent p-0 text-[13px]"
                >
                  {current.gutenbergId ? "Continue reading" : "Update progress"}
                </button>
              </p>
            </>
          ) : (
            <p className="m-0 mt-2.5 text-sm text-muted">Nothing on the go. Open a book on your shelf and press “Start reading”.</p>
          )}
        </div>
        <div className="min-w-[220px] flex-[0.8]">
          <p className="eyebrow m-0">Your week</p>
          <div
            className="mt-3 flex items-end gap-2"
            role="img"
            aria-label={`Pages read in the last 7 days: ${week.map((d) => d.pages).join(", ")}`}
          >
            {week.map((d) => (
              <div key={d.ts} className="flex flex-col items-center gap-1.5">
                <div className="flex h-12 w-5 items-end bg-[#ebe4d8]">
                  <div
                    className="w-full bg-ink transition-[height] duration-500"
                    style={{ height: d.pages ? `${Math.max(12, Math.min(100, (d.pages / 40) * 100))}%` : d.active ? "12%" : 0 }}
                  />
                </div>
                <span className="text-[11px] text-label">{DAY_LETTER[new Date(d.ts).getDay()]}</span>
              </div>
            ))}
          </div>
          <p className="m-0 mt-2.5 text-[13px] text-muted">
            {days > 0 ? `${days}-day reading streak` : "Read a little today to start a streak"}
            {weekPages > 0 ? ` · ${weekPages} pages this week` : ""}
          </p>
        </div>
        <div className="min-w-[260px] flex-1">
          <p className="eyebrow m-0">A suggestion</p>
          {suggestion ? (
            <>
              <button
                type="button"
                onClick={() => openInfo(suggestion)}
                className="m-0 mt-2.5 block cursor-pointer border-0 bg-transparent p-0 text-left font-serif text-[28px] text-ink hover:text-clay-ink"
              >
                {suggestion.title}
              </button>
              <p className="m-0 mt-1.5 text-sm leading-relaxed text-muted">
                {suggestion.reason}{" "}
                <Link href="/next" className="link">
                  See all
                </Link>
              </p>
            </>
          ) : (
            <p className="m-0 mt-2.5 text-sm leading-relaxed text-muted">
              Let AI look at what you&apos;ve read and suggest what&apos;s next.{" "}
              <Link href="/next" className="link">
                Get suggestions
              </Link>
            </p>
          )}
        </div>
      </section>
    </>
  );
}
