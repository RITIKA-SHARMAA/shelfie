"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { errorText } from "@/lib/errors";
import { sortPicks, type PickSort as Sort } from "@/lib/picks";
import { MOOD_KEYS, type Mood } from "@/lib/recommend";
import { useShelf, type Pick } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { BookCover } from "./BookCover";
import { Chips } from "./Controls";

const MOOD_LABEL: Record<Mood, string> = { any: "Anything", light: "Light", learn: "Learn", story: "A story", classic: "A classic" };
const MOOD_NOTE: Record<Mood, string> = {
  any: "Books that fit your taste, fiction or not.",
  light: "Easy, warm reads, mostly under 350 pages.",
  learn: "Non-fiction that teaches a skill or an idea.",
  story: "Novels and stories only.",
  classic: "Widely read books from before 1970.",
};

const SORT_LABEL: Record<Sort, string> = { match: "Best match", short: "Shortest first", new: "Newest first", old: "Oldest first" };

function timeAgo(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function NextPage() {
  const books = useShelf((s) => s.books);
  const allPicks = useShelf((s) => s.picks);
  const seen = useShelf((s) => s.seen);
  const dismissed = useShelf((s) => s.dismissed);
  const setPicks = useShelf((s) => s.setPicks);
  const dismissPick = useShelf((s) => s.dismissPick);
  const addBook = useShelf((s) => s.addBook);
  const openInfo = useUI((s) => s.openInfo);
  const showToast = useUI((s) => s.showToast);

  const lastMood = (Object.entries(allPicks).sort((a, b) => b[1].at - a[1].at)[0]?.[0] as Mood | undefined) ?? "any";
  const [mood, setMood] = useState<Mood>(MOOD_KEYS.includes(lastMood) ? lastMood : "any");
  const [sort, setSort] = useState<Sort>("match");
  const [loading, setLoading] = useState<Mood | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finished = useMemo(() => books.filter((b) => b.status === "finished"), [books]);
  const canAsk = books.some((b) => b.status !== "want");
  const picks = allPicks[mood];
  const items = useMemo(() => sortPicks(picks?.items ?? [], sort), [picks, sort]);

  async function suggest(m: Mood, again: boolean) {
    setLoading(m);
    setError(null);
    const ref = (b: (typeof books)[number]) => ({ title: b.title, author: b.author, rating: b.rating });
    const body = {
      mood: m,
      finished: [...finished]
        .sort((a, b) => b.rating - a.rating || (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
        .slice(0, 40)
        .map(ref),
      reading: books
        .filter((b) => b.status === "reading")
        .slice(0, 20)
        .map(ref),
      want: books
        .filter((b) => b.status === "want")
        .slice(0, 60)
        .map(ref),
      exclude: dismissed.slice(-100),
      // "Suggest again" asks for books that haven't been suggested before.
      seen: again ? seen.slice(-80) : [],
    };
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorText(data.error));
        return;
      }
      setPicks(m, data.picks as Pick[]);
    } catch {
      setError(errorText("network"));
    } finally {
      setLoading(null);
    }
  }

  // Choosing a mood shows its suggestions straight away, asking the AI the first time.
  const chooseMood = (m: Mood) => {
    setMood(m);
    setError(null);
    if (!allPicks[m] && canAsk && !loading) suggest(m, false);
  };

  const onShelf = (p: Pick) => books.some((b) => (b.olKey && b.olKey === p.olKey) || b.title.toLowerCase() === p.title.toLowerCase());
  const busy = loading === mood;

  return (
    <div className="mx-auto max-w-[820px]">
      <section className="mt-10">
        <p className="eyebrow m-0 text-sage">Suggested for you</p>
        <h1 className="m-0 mt-2 font-serif text-[44px] leading-none font-medium sm:text-[56px]">What to read next</h1>
        <p className="m-0 mt-3 text-[15px] leading-relaxed text-muted">
          Chosen from the {finished.length} book{finished.length === 1 ? "" : "s"} you&apos;ve finished and how you rated them. Pick a mood.
        </p>
      </section>

      <div className="mt-9">
        <Chips<Mood> label="Mood" value={mood} onChange={chooseMood} options={MOOD_KEYS.map((m) => ({ value: m, label: MOOD_LABEL[m] }))} />
        <p className="m-0 mt-3 text-[13px] text-label">{MOOD_NOTE[mood]}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <label className="flex items-center gap-2 text-[13px] text-muted">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            disabled={!items.length}
            className="h-10 cursor-pointer rounded-full border border-line-strong bg-paper px-3 text-[13px] text-ink disabled:opacity-50"
          >
            {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => suggest(mood, !!picks)}
          disabled={!!loading || !canAsk}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-ink px-6 text-sm font-semibold text-ground disabled:cursor-default disabled:opacity-40"
        >
          <RefreshCw size={15} strokeWidth={2} aria-hidden="true" className={busy ? "animate-spin" : ""} />
          {busy ? "Thinking…" : picks ? "Suggest new books" : "Suggest books"}
        </button>
      </div>

      {!canAsk && <p className="mt-6 text-sm text-muted">Mark a book as reading or finished first, so there&apos;s something to go on.</p>}
      {error && (
        <p role="alert" className="mt-6 text-sm text-clay-ink">
          {error}
        </p>
      )}

      <div aria-live="polite" className="mt-2">
        {busy ? (
          <ul className="m-0 grid list-none gap-x-8 p-0 sm:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex gap-5 border-b border-line py-6">
                <div className="shimmer h-[96px] w-[64px]" />
                <div className="flex-1 space-y-3">
                  <div className="shimmer h-6 w-2/3" />
                  <div className="shimmer h-4 w-1/3" />
                  <div className="shimmer h-4 w-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          picks && (
            <>
              <p className="mt-5 mb-0 text-xs text-label">
                {MOOD_LABEL[mood]} · {items.length} suggestion{items.length === 1 ? "" : "s"} · {timeAgo(picks.at)} · click a book to read
                about it
              </p>
              <ol className="m-0 grid list-none gap-x-8 p-0 sm:grid-cols-2">
                <AnimatePresence initial={false}>
                  {items.map((p, i) => {
                    const added = onShelf(p);
                    return (
                      <motion.li
                        key={p.olKey}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }}
                        exit={{ opacity: 0, x: 40 }}
                        className="flex gap-5 border-b border-line py-6"
                      >
                        <button
                          type="button"
                          onClick={() => openInfo(p)}
                          aria-label={`About ${p.title}`}
                          className="shrink-0 cursor-pointer self-start border-0 bg-transparent p-0 transition-transform hover:-translate-y-1"
                        >
                          <BookCover title={p.title} author={p.author} coverId={p.coverId} width={64} height={96} size="sm" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => openInfo(p)}
                            className="cursor-pointer border-0 bg-transparent p-0 text-left font-serif text-[24px] leading-tight text-ink hover:text-clay-ink"
                          >
                            {p.title}
                          </button>
                          <div className="mt-0.5 text-[13px] text-label">
                            {p.author}
                            {p.year ? ` · ${p.year}` : ""}
                            {p.pages ? ` · ${p.pages} pages` : ""}
                          </div>
                          <p className="m-0 mt-2 text-[14px] leading-relaxed text-[#4a4239]">{p.reason}</p>
                          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                            {added ? (
                              <span className="text-sage">On your shelf ✓</span>
                            ) : (
                              <button
                                type="button"
                                className="link cursor-pointer border-0 bg-transparent p-0"
                                onClick={() => {
                                  addBook(p, "want");
                                  showToast(`Added “${p.title}” to want to read.`);
                                }}
                              >
                                Add to shelf
                              </button>
                            )}
                            <button
                              type="button"
                              className="cursor-pointer border-0 bg-transparent p-0 text-label hover:text-ink"
                              onClick={() => openInfo(p)}
                            >
                              About
                            </button>
                            <button
                              type="button"
                              className="cursor-pointer border-0 bg-transparent p-0 text-label hover:text-ink"
                              onClick={() => dismissPick(p.title)}
                            >
                              Not now
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ol>
              {items.length === 0 && <p className="mt-6 text-sm text-muted">That&apos;s all of them. Ask for new books.</p>}
            </>
          )
        )}
        {!picks && !busy && canAsk && !error && <p className="mt-8 text-sm text-muted">Pick a mood above, or press “Suggest books”.</p>}
      </div>

      <p className="mt-10 text-xs leading-relaxed text-label">
        Suggested by Gemini, then checked against Open Library: a title only appears if Open Library has a book with that title and author,
        so every pick is a real book you can add. Books that clearly don&apos;t fit the mood are left out.
      </p>
    </div>
  );
}
