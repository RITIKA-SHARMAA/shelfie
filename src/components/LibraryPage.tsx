"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { progressPct } from "@/lib/stats";
import { useShelf } from "@/lib/store";
import { STATUS_LABEL, type Status } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { BookCover } from "./BookCover";
import { Chips } from "./Controls";

type Filter = "all" | Status;
type Sort = "recent" | "title" | "author" | "rating";

const DOT: Record<Status, string> = { reading: "var(--color-clay)", want: "var(--color-sage)", finished: "var(--color-ink)" };

function initialFilter(): Filter {
  if (typeof window === "undefined") return "all";
  const s = new URLSearchParams(window.location.search).get("status");
  return s === "reading" || s === "want" || s === "finished" ? s : "all";
}

/** Every book, including the ones that don't fit on the shelf. */
export function LibraryPage() {
  const books = useShelf((s) => s.books);
  const openBook = useUI((s) => s.openBook);
  const openAdd = useUI((s) => s.openAdd);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [sort, setSort] = useState<Sort>("recent");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c = { all: books.length, reading: 0, want: 0, finished: 0 };
    for (const b of books) c[b.status] += 1;
    return c;
  }, [books]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = books.filter(
      (b) =>
        (filter === "all" || b.status === filter) &&
        (!needle || `${b.title} ${b.author} ${b.tags.join(" ")}`.toLowerCase().includes(needle)),
    );
    const by: Record<Sort, (a: (typeof out)[number], b: (typeof out)[number]) => number> = {
      recent: (a, b) => b.updatedAt - a.updatedAt,
      title: (a, b) => a.title.localeCompare(b.title),
      author: (a, b) => a.author.localeCompare(b.author),
      rating: (a, b) => b.rating - a.rating || b.updatedAt - a.updatedAt,
    };
    return out.sort(by[sort]);
  }, [books, filter, sort, q]);

  return (
    <div>
      <section className="mt-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow m-0">Every book you keep</p>
          <h1 className="m-0 mt-2 font-serif text-[44px] leading-none font-medium sm:text-[60px]">Your library</h1>
          <p className="m-0 mt-3 text-[15px] text-muted">The shelf shows what fits on one plank. Everything is here.</p>
        </div>
        <button
          type="button"
          onClick={() => openAdd("", filter === "all" ? "want" : filter)}
          className="h-11 cursor-pointer rounded-full border-0 bg-ink px-5 text-sm font-semibold text-ground"
        >
          Add a book
        </button>
      </section>

      <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
        <Chips<Filter>
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All · ${counts.all}` },
            { value: "reading", label: `Reading · ${counts.reading}` },
            { value: "want", label: `Want to read · ${counts.want}` },
            { value: "finished", label: `Finished · ${counts.finished}` },
          ]}
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex h-10 items-center gap-2 border-b border-line-strong">
            <Search size={15} className="text-muted" aria-hidden="true" />
            <span className="sr-only">Filter your books</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by title, author, tag"
              className="w-[200px] border-0 bg-transparent text-sm outline-none placeholder:text-label"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-muted">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-10 cursor-pointer rounded-full border border-line-strong bg-paper px-3 text-[13px] text-ink"
            >
              <option value="recent">Recently active</option>
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="rating">Your rating</option>
            </select>
          </label>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-12 text-sm text-muted">{books.length === 0 ? "No books yet. Add your first one." : "No books match."}</p>
      ) : (
        <ul className="m-0 mt-9 grid list-none grid-cols-2 gap-x-6 gap-y-9 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {list.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => openBook(b.id)}
                className="group w-full cursor-pointer border-0 bg-transparent p-0 text-left"
              >
                <div className="transition-transform duration-200 group-hover:-translate-y-1.5">
                  <BookCover
                    title={b.title}
                    author={b.author}
                    coverId={b.coverId}
                    width={120}
                    height={180}
                    size="md"
                    className="!h-auto !w-full shadow-[0_14px_22px_-14px_rgba(60,35,15,0.45)] [aspect-ratio:2/3]"
                  />
                </div>
                <p className="m-0 mt-3 line-clamp-2 font-serif text-[19px] leading-tight text-ink">{b.title}</p>
                <p className="m-0 mt-0.5 truncate text-[13px] text-label">{b.author}</p>
                <p className="m-0 mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                  <span className="size-2 rounded-full" style={{ background: DOT[b.status] }} />
                  {b.status === "reading"
                    ? `${progressPct(b)}% read`
                    : b.status === "finished" && b.rating
                      ? `${"●".repeat(b.rating)}${"○".repeat(5 - b.rating)}`
                      : STATUS_LABEL[b.status]}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
