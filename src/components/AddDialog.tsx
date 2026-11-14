"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useState } from "react";
import { spineLook } from "@/lib/spine";
import { useShelf } from "@/lib/store";
import { STATUS_LABEL, type BookResult, type Status } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { useBookSearch } from "@/lib/useSearch";
import { BookCover } from "./BookCover";
import { StatusPicker } from "./Controls";
import { Modal } from "./Modal";

export function AddDialog() {
  const initial = useUI((s) => s.addQuery);
  const initialStatus = useUI((s) => s.addStatus);
  const close = useUI((s) => s.closeAdd);
  const addBook = useShelf((s) => s.addBook);
  const books = useShelf((s) => s.books);

  const [query, setQuery] = useState(initial);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [last, setLast] = useState<{ book: BookResult; status: Status } | null>(null);
  const [manual, setManual] = useState(false);
  const { results, phase, active: showResults } = useBookSearch(query);

  const onShelf = (r: BookResult) => books.some((b) => (b.olKey && b.olKey === r.olKey) || b.title.toLowerCase() === r.title.toLowerCase());

  const add = (r: BookResult) => {
    addBook(r, status);
    setLast({ book: r, status });
  };

  return (
    <Modal label="Add a book" onClose={close} className="w-full max-w-[760px]">
      <div data-card className="flex flex-col gap-6 border border-[#e3dacb] bg-paper px-6 py-9 sm:px-[52px] sm:py-11">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 font-serif text-[40px] font-medium">Add a book</h2>
          <button type="button" onClick={close} className="h-11 cursor-pointer border-0 bg-transparent text-sm text-muted hover:text-ink">
            Close
          </button>
        </div>

        <label className="flex h-[52px] items-center gap-3 border-b border-ink">
          <Search size={18} strokeWidth={1.6} aria-hidden="true" />
          <span className="sr-only">Search by title or author</span>
          <input
            data-autofocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title or author"
            className="min-w-0 flex-1 border-0 bg-transparent font-serif text-[26px] outline-none placeholder:text-label"
          />
          {phase === "loading" && <span className="text-xs text-label">Searching…</span>}
          {phase === "done" && showResults && <span className="text-xs text-label">{results.length} found</span>}
        </label>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="eyebrow">Add to</span>
          <StatusPicker value={status} onChange={setStatus} label="Add to" size="sm" />
        </div>

        {showResults && phase === "error" && (
          <p role="alert" className="m-0 text-sm text-clay-ink">
            Open Library didn&apos;t answer just now. Try again in a moment, or{" "}
            <button type="button" className="link cursor-pointer border-0 bg-transparent p-0" onClick={() => setManual(true)}>
              add it by hand
            </button>
            .
          </p>
        )}

        {showResults && (
          <ul className="m-0 max-h-[46vh] list-none overflow-y-auto p-0">
            {phase === "loading" && results.length === 0
              ? [0, 1, 2].map((i) => <li key={i} className="shimmer my-2 h-16" />)
              : results.map((r) => {
                  const there = onShelf(r);
                  return (
                    <li key={r.olKey} className="flex items-center gap-5 border-b border-[#e3dacb] py-3.5">
                      <BookCover title={r.title} author={r.author} coverId={r.coverId} width={40} height={60} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-serif text-[22px]">{r.title}</div>
                        <div className="text-[13px] text-muted">
                          {r.author}
                          {r.year ? ` · ${r.year}` : ""}
                          {r.pages ? ` · ${r.pages} pages` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={there}
                        onClick={() => add(r)}
                        className={`h-10 shrink-0 cursor-pointer rounded-full border border-ink px-[18px] text-[13px] disabled:cursor-default ${there ? "bg-ink text-ground" : "bg-transparent text-ink hover:bg-ink hover:text-ground"}`}
                      >
                        {there ? "On shelf" : "Add"}
                      </button>
                    </li>
                  );
                })}
            {phase === "done" && results.length === 0 && (
              <li className="py-4 text-sm text-muted">No books found. Try the author&apos;s name too.</li>
            )}
          </ul>
        )}

        {manual ? (
          <ManualAdd
            onAdd={(r) => {
              add(r);
              setManual(false);
            }}
          />
        ) : (
          !showResults && (
            <p className="m-0 text-sm text-muted">
              Search millions of books from Open Library, or{" "}
              <button type="button" className="link cursor-pointer border-0 bg-transparent p-0" onClick={() => setManual(true)}>
                add one by hand
              </button>
              .
            </p>
          )
        )}

        {/* the newest book settles onto a little oak strip */}
        <div aria-live="polite">
          <p className="m-0 mb-3 text-[13px] text-muted">
            {last ? (
              <>
                Added “{last.book.title}” to {STATUS_LABEL[last.status].toLowerCase()}.
              </>
            ) : (
              "New books settle onto your shelf, gently."
            )}
          </p>
          <div className="flex h-[110px] items-end gap-[2px] px-7">
            {["#e8e0d1", "#a7b39a", "#5d5a52"].map((c, i) => (
              <div key={i} style={{ width: 22 + i * 3, height: 88 + i * 7, background: c }} />
            ))}
            {last && (
              <motion.div
                key={last.book.olKey || last.book.title}
                initial={{ y: -90, opacity: 0, rotate: -6 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 14 }}
                className="ml-2 flex items-center justify-center"
                style={{
                  width: 30,
                  height: 104,
                  background: spineLook({ ...last.book, pages: last.book.pages ?? 0, status: last.status }).color,
                }}
              >
                <span
                  className="max-h-[85%] overflow-hidden text-[10px] tracking-[0.08em] whitespace-nowrap [writing-mode:vertical-rl] rotate-180"
                  style={{ color: spineLook({ ...last.book, pages: last.book.pages ?? 0, status: last.status }).ink }}
                >
                  {last.book.title}
                </span>
              </motion.div>
            )}
          </div>
          <div className="h-2.5 bg-oak" />
        </div>
      </div>
    </Modal>
  );
}

function ManualAdd({ onAdd }: { onAdd: (r: BookResult) => void }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");
  return (
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1.4fr_0.8fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd({
          olKey: "",
          title: title.trim(),
          author: author.trim() || "Unknown author",
          year: null,
          pages: Number(pages) || null,
          coverId: null,
          tags: [],
        });
      }}
    >
      {[
        { id: "m-title", label: "Title", value: title, set: setTitle },
        { id: "m-author", label: "Author", value: author, set: setAuthor },
        { id: "m-pages", label: "Pages", value: pages, set: (v: string) => setPages(v.replace(/\D/g, "").slice(0, 5)) },
      ].map((f) => (
        <label key={f.id} htmlFor={f.id} className="flex flex-col gap-1 text-xs text-label">
          {f.label}
          <input
            id={f.id}
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            className="h-10 border-0 border-b border-line-strong bg-transparent text-base text-ink outline-none focus:border-ink"
          />
        </label>
      ))}
      <button type="submit" className="h-10 cursor-pointer rounded-full border-0 bg-ink px-5 text-sm text-ground">
        Add
      </button>
    </form>
  );
}
