"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { journalByMonth, journalLine } from "@/lib/journal";
import { spineLook } from "@/lib/spine";
import { yearStats } from "@/lib/stats";
import { useShelf } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { fallbackLine } from "@/lib/yearline";
import { Pot, Vase } from "./Decor";
import { GoalRing } from "./GoalRing";

const MONTH_NAME = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function YearPage() {
  const books = useShelf((s) => s.books);
  const cached = useShelf((s) => s.yearLine);
  const setYearLine = useShelf((s) => s.setYearLine);
  const journal = useShelf((s) => s.journal);
  const openBook = useUI((s) => s.openBook);
  const openAdd = useUI((s) => s.openAdd);
  const showToast = useUI((s) => s.showToast);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [copied, setCopied] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const years = useMemo(() => {
    // Past years are always reachable, so older reads can be filed under the right year.
    const ys = new Set<number>([thisYear, thisYear - 1]);
    for (const b of books) if (b.finishedAt) ys.add(new Date(b.finishedAt).getFullYear());
    for (const j of journal) ys.add(new Date(j.at).getFullYear());
    return [...ys].sort((a, b) => a - b);
  }, [books, journal, thisYear]);
  const months = useMemo(() => journalByMonth(journal, year), [journal, year]);

  const s = useMemo(() => yearStats(books, year), [books, year]);
  const key = `${year}:${s.finished.length}:${s.pages}:${s.favourite?.title ?? ""}:${refresh}`;
  const request = useMemo(
    () => ({
      year,
      count: s.finished.length,
      pages: s.pages,
      favourite: s.favourite?.title,
      topTag: s.topTag?.tag,
      titles: s.finished.slice(0, 40).map((b) => b.title),
    }),
    [year, s],
  );
  const line = cached?.key === key ? cached.line : null;

  // Ask the AI for a one-line summary when the year's numbers change; keep the plain line if it can't answer.
  useEffect(() => {
    if (line || request.count === 0) return;
    const ctrl = new AbortController();
    fetch("/api/year-line", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.line && setYearLine(key, d.line))
      .catch(() => {});
    return () => ctrl.abort();
  }, [key, line, request, setYearLine]);

  const idx = years.indexOf(year);
  const max = Math.max(1, ...s.perMonth);

  const share = async () => {
    const text = `My ${year} in books: ${s.finished.length} books, ${s.pages.toLocaleString("en-IN")} pages${s.favourite ? `. Favourite: ${s.favourite.title}` : ""}. Made with Shelfie.`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        showToast("Copied your year to the clipboard.");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user cancelled the share sheet */
    }
  };

  return (
    <div className="mx-auto max-w-[880px]">
      <section className="mt-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous year"
              disabled={idx <= 0}
              onClick={() => setYear(years[idx - 1])}
              className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-ink disabled:opacity-25"
            >
              <ChevronLeft size={18} strokeWidth={1.6} />
            </button>
            <span className="eyebrow">{year}</span>
            <button
              type="button"
              aria-label="Next year"
              disabled={idx >= years.length - 1}
              onClick={() => setYear(years[idx + 1])}
              className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-ink disabled:opacity-25"
            >
              <ChevronRight size={18} strokeWidth={1.6} />
            </button>
          </div>
          <h1 className="m-0 mt-2 font-serif text-[52px] leading-[0.95] font-medium sm:text-[72px]">
            The year,
            <br />
            in books.
          </h1>
        </div>
        <GoalRing done={s.finished.length} year={year} showLink={false} />
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={share}
          className="h-11 cursor-pointer rounded-full border border-ink bg-transparent px-5 text-sm text-ink hover:bg-ink hover:text-ground"
        >
          {copied ? "Copied" : "Share my year"}
        </button>
        <button
          type="button"
          onClick={() => openAdd("", "finished")}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-transparent px-5 text-sm text-ink hover:border-ink"
        >
          <Plus size={14} aria-hidden="true" />
          Add a book you finished
        </button>
        {year !== thisYear && (
          <span className="self-center text-xs text-label">Added books are marked finished today. Open one to set its date in {year}.</span>
        )}
      </div>

      {/* the year's finished books on their own small shelf */}
      <div className="mt-12">
        <div className="flex h-[170px] items-end justify-center gap-[2px] overflow-hidden px-6">
          <div className="mr-5 flex items-end">
            <Vase />
          </div>
          {s.finished.length === 0 && <p className="mb-6 text-sm text-muted">No finished books in {year} yet.</p>}
          {s.finished.map((b, i) => {
            const look = spineLook(b);
            return (
              <button
                type="button"
                key={b.id}
                title={b.title}
                aria-label={`${b.title}, finished ${new Date(b.finishedAt!).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}`}
                onClick={() => openBook(b.id)}
                className="flex shrink-0 cursor-pointer items-center justify-center border-0 p-0 transition-transform hover:-translate-y-2"
                style={{
                  width: look.width,
                  height: Math.round(look.height * 0.72),
                  background: look.color,
                  color: look.ink,
                  transformOrigin: "bottom left",
                  rotate: i === s.finished.length - 1 && s.finished.length > 3 ? "8deg" : "0deg",
                }}
              >
                <span className="max-h-[86%] overflow-hidden text-[9px] tracking-[0.06em] whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
                  {b.title}
                </span>
              </button>
            );
          })}
          <div className="ml-6 flex items-end">
            <Pot />
          </div>
        </div>
        <div className="h-2.5 bg-oak" />
      </div>

      <dl className="m-0 mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {[
          ["Books", String(s.finished.length), true],
          ["Pages", s.pages.toLocaleString("en-IN"), true],
          ["Favourite", s.favourite?.title ?? "—", false],
          ["Longest", s.longest ? s.longest.title : "—", false],
        ].map(([k, v, big]) => (
          <div key={String(k)}>
            <dt className="eyebrow">{k}</dt>
            <dd className={`m-0 mt-1.5 font-serif ${big ? "text-[48px] leading-none" : "text-[26px] leading-tight"}`}>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12">
        <p className="eyebrow m-0 mb-3">Month by month</p>
        <div role="img" aria-label={`Books finished per month in ${year}: ${s.perMonth.join(", ")}`} className="grid grid-cols-12 gap-2">
          {s.perMonth.map((n, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="flex flex-col justify-end gap-1" style={{ height: max * 13 }}>
                {Array.from({ length: n }, (_, j) => (
                  <span key={j} className="size-[9px] rounded-full bg-ink" />
                ))}
              </div>
              <span className="text-[11px] text-label">{MONTHS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <p className="eyebrow m-0 mb-1">Reading journal</p>
        {months.length === 0 ? (
          <p className="m-0 mt-2 text-sm text-muted">
            Nothing logged in {year} yet. Starting, reading and finishing books are noted here as you go.
          </p>
        ) : (
          <div className="mt-2 grid gap-x-10 sm:grid-cols-2">
            {months.slice(0, 6).map(({ month, items }) => (
              <div key={month} className="border-t border-line py-4">
                <p className="m-0 font-serif text-xl">{MONTH_NAME[month]}</p>
                <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
                  {items.slice(0, 6).map((j) => (
                    <li key={j.id} className="flex gap-3 text-[13px] text-muted">
                      <span className="w-6 shrink-0 text-right text-label">{new Date(j.at).getDate()}</span>
                      <span className={j.kind === "finished" ? "text-ink" : ""}>{journalLine(j)}</span>
                    </li>
                  ))}
                  {items.length > 6 && <li className="pl-9 text-xs text-label">and {items.length - 6} more</li>}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-12 border-t border-line pt-6">
        <p className="m-0 font-serif text-2xl leading-snug text-[#4a4239] italic">“{line ?? fallbackLine(request)}”</p>
        <p className="m-0 mt-2 flex flex-wrap gap-x-4 text-xs text-label">
          <span>{line ? "Written for you by AI from your shelf" : "A plain summary of your year"}</span>
          {request.count > 0 && (
            <button
              type="button"
              onClick={() => setRefresh((r) => r + 1)}
              className="link cursor-pointer border-0 bg-transparent p-0 text-xs"
            >
              Write it again
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
