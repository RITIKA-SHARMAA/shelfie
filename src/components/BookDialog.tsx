"use client";

import { BookOpen, X } from "lucide-react";
import { useState } from "react";
import { bookActions } from "@/lib/actions";
import { progressPct } from "@/lib/stats";
import { useShelf } from "@/lib/store";
import { STATUS_LABEL } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { useDetails } from "@/lib/useDetails";
import { BookAbout } from "./BookAbout";
import { BookCover } from "./BookCover";
import { StatusPicker } from "./Controls";
import { Modal } from "./Modal";

const toDateInput = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** A book pulled off the shelf and opened: details on the left page, your progress and notes on the right. */
export function BookDialog({ id }: { id: string }) {
  const book = useShelf((s) => s.books.find((b) => b.id === id));
  const update = useShelf((s) => s.updateBook);
  const setFinishedAt = useShelf((s) => s.setFinishedAt);
  const readerPos = useShelf((s) => s.readerPos[id]);
  const close = useUI((s) => s.closeBook);
  const openReader = useUI((s) => s.openReader);
  const [confirm, setConfirm] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [now] = useState(() => Date.now());
  const { details, phase } = useDetails(book ?? null, id);

  if (!book) return null;
  const pct = progressPct(book);
  const { changeStatus, remove } = bookActions;
  const free = book.gutenbergId ?? details?.gutenbergId ?? null;

  const read = () => {
    if (book.status === "want") changeStatus(book.id, "reading");
    else openReader(book.id);
  };

  const addTag = () => {
    const t = tagDraft.trim().replace(/\s+/g, " ").slice(0, 24);
    if (t && !book.tags.some((x) => x.toLowerCase() === t.toLowerCase()))
      update(book.id, { tags: [...book.tags, t[0].toUpperCase() + t.slice(1)] });
    setTagDraft("");
  };

  return (
    <Modal label={`${book.title} by ${book.author}`} onClose={close} className="w-full max-w-[1120px]">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={close}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-paper px-4 text-sm text-ink"
        >
          <X size={16} strokeWidth={1.8} aria-hidden="true" />
          Back to the shelf
        </button>
      </div>

      <div data-card className="flex flex-wrap border border-[#e3dacb] bg-paper shadow-[0_30px_60px_-40px_rgba(90,60,30,0.45)]">
        {/* left page */}
        <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-8 border-[#e3dacb] p-8 sm:p-14 md:border-r">
          <div className="flex flex-wrap items-end gap-8">
            <BookCover
              title={book.title}
              author={book.author}
              coverId={book.coverId}
              width={132}
              height={196}
              size="lg"
              className="shadow-[0_18px_26px_-14px_rgba(60,35,15,0.45)]"
            />
            <div className="min-w-0 flex-1">
              <p className="eyebrow m-0">{STATUS_LABEL[book.status]}</p>
              <h2 className="m-0 mt-2 font-serif text-[44px] leading-none font-medium">{book.title}</h2>
              <p className="m-0 mt-2 text-[15px] text-muted">
                {book.author}
                {book.pages ? ` · ${book.pages} pages` : ""}
                {book.year ? ` · ${book.year}` : ""}
              </p>
            </div>
          </div>

          <div>
            <p className="eyebrow m-0 mb-2.5">Status</p>
            <StatusPicker value={book.status} onChange={(st) => changeStatus(book.id, st)} label="Book status" />
          </div>

          <div>
            <p className="eyebrow m-0 mb-3">About this book</p>
            <BookAbout details={details} phase={phase} />
          </div>

          <div>
            <p className="eyebrow m-0">Tags</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {book.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-line-strong pr-1.5 pl-3.5 text-[13px]"
                >
                  {t}
                  <button
                    type="button"
                    aria-label={`Remove tag ${t}`}
                    onClick={() => update(book.id, { tags: book.tags.filter((x) => x !== t) })}
                    className="grid size-6 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted hover:text-ink"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </span>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addTag();
                }}
              >
                <label htmlFor="tag-input" className="sr-only">
                  Add a tag
                </label>
                <input
                  id="tag-input"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onBlur={addTag}
                  placeholder="+ add tag"
                  className="h-8 w-28 border-0 border-b border-transparent bg-transparent text-[13px] outline-none placeholder:text-label focus:border-ink"
                />
              </form>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-4 text-xs text-label">
            {book.olKey ? (
              <a href={`https://openlibrary.org${book.olKey}`} target="_blank" rel="noreferrer" className="link border-0">
                View on Open Library ↗
              </a>
            ) : (
              <span>{book.id.startsWith("sample-") ? "Sample book" : "Added by hand"}</span>
            )}
            <button
              type="button"
              onClick={() => {
                if (!confirm) return setConfirm(true);
                remove(book.id);
              }}
              onBlur={() => setConfirm(false)}
              className={`h-9 cursor-pointer rounded-full border px-3.5 text-xs ${confirm ? "border-clay bg-clay text-white" : "border-line-strong bg-transparent text-muted hover:text-ink"}`}
            >
              {confirm ? "Click again to remove" : "Remove from shelf"}
            </button>
          </div>
        </section>

        {/* right page */}
        <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-8 p-8 sm:p-14">
          <ReadBox
            free={free}
            access={details?.ebookAccess ?? null}
            olKey={book.olKey ?? details?.olKey ?? null}
            started={readerPos !== undefined || book.status === "reading"}
            onRead={free ? read : undefined}
          />

          <div>
            <div className="flex items-baseline justify-between">
              <p className="eyebrow m-0">Progress</p>
              <p className="m-0 font-serif text-[40px]">{pct}%</p>
            </div>
            {book.status === "finished" ? (
              <label className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
                Finished on
                <input
                  type="date"
                  value={toDateInput(book.finishedAt ?? now)}
                  max={toDateInput(now)}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split("-").map(Number);
                    if (y && m && d) setFinishedAt(book.id, new Date(y, m - 1, d, 20).getTime());
                  }}
                  className="h-9 border-0 border-b border-ink bg-transparent text-[15px] text-ink outline-none"
                />
                <span className="text-xs text-label">Change it to file the book under another year.</span>
              </label>
            ) : book.status === "want" ? (
              <p className="m-0 mt-2 text-sm text-muted">Not started yet.</p>
            ) : book.pages ? (
              <>
                <label htmlFor="page" className="mt-2.5 block text-[13px] text-muted">
                  Page {book.currentPage} of {book.pages}
                </label>
                <input
                  id="page"
                  type="range"
                  min={0}
                  max={book.pages}
                  value={book.currentPage}
                  onChange={(e) => update(book.id, { currentPage: Number(e.target.value) })}
                  className="page-slider mt-1 h-7 w-full"
                />
              </>
            ) : (
              <label className="mt-2.5 flex items-center gap-3 text-[13px] text-muted">
                How many pages does it have?
                <input
                  inputMode="numeric"
                  placeholder="e.g. 320"
                  onBlur={(e) => Number(e.target.value) > 0 && update(book.id, { pages: Number(e.target.value) })}
                  className="h-9 w-24 border-0 border-b border-ink bg-transparent text-base text-ink outline-none"
                />
              </label>
            )}
          </div>

          <div>
            <p className="eyebrow m-0">Your rating</p>
            <div role="radiogroup" aria-label="Rating" className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={book.rating === n}
                  aria-label={`${n} of 5`}
                  onClick={() => update(book.id, { rating: book.rating === n ? 0 : n })}
                  className="grid size-11 cursor-pointer place-items-center border-0 bg-transparent p-0"
                >
                  <span
                    className="size-4 rounded-full border border-ink"
                    style={{ background: n <= book.rating ? "var(--color-ink)" : "transparent" }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <label htmlFor="notes" className="eyebrow">
              Notes
            </label>
            <textarea
              id="notes"
              value={book.notes}
              onChange={(e) => update(book.id, { notes: e.target.value.slice(0, 4000) })}
              placeholder="A line you want to remember…"
              className="mt-2.5 min-h-[150px] flex-1 resize-none border-0 bg-[repeating-linear-gradient(180deg,transparent_0_31px,#e3dacb_31px_32px)] p-0 font-serif text-xl leading-8 text-ink outline-none placeholder:text-label"
            />
          </div>

          <div className="flex flex-wrap items-center gap-5">
            {book.status === "reading" && (
              <button
                type="button"
                onClick={() => changeStatus(book.id, "finished")}
                className="h-12 cursor-pointer rounded-full border-0 bg-ink px-7 text-sm font-semibold text-ground"
              >
                Mark as finished
              </button>
            )}
            {book.status === "want" && (
              <button
                type="button"
                onClick={() => changeStatus(book.id, "reading")}
                className="h-12 cursor-pointer rounded-full border-0 bg-ink px-7 text-sm font-semibold text-ground"
              >
                {free ? "Start reading here" : "Start reading"}
              </button>
            )}
            {book.status === "finished" && (
              <button
                type="button"
                onClick={() => changeStatus(book.id, "reading")}
                className="h-12 cursor-pointer rounded-full border border-ink bg-transparent px-7 text-sm text-ink"
              >
                Read it again
              </button>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}

/** Can the book be read? Free public-domain text opens in the reader; otherwise point to Open Library honestly. */
function ReadBox({
  free,
  access,
  olKey,
  started,
  onRead,
}: {
  free: string | null;
  access: string | null;
  olKey: string | null;
  started: boolean;
  onRead?: () => void;
}) {
  if (free && onRead)
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[2px] border border-[#d8cdb9] bg-ground/60 px-5 py-4">
        <div>
          <p className="m-0 text-sm font-semibold text-ink">Free to read here</p>
          <p className="m-0 mt-0.5 text-[13px] text-muted">Public domain, from Project Gutenberg. Your place is saved.</p>
        </div>
        <button
          type="button"
          onClick={onRead}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-clay px-5 text-sm font-semibold text-white hover:bg-clay-ink"
        >
          <BookOpen size={16} strokeWidth={1.9} aria-hidden="true" />
          {started ? "Continue reading" : "Read the book"}
        </button>
      </div>
    );
  if (!access) return null;
  const borrow = access === "borrowable" || access === "public";
  return (
    <p className="m-0 text-[13px] leading-relaxed text-muted">
      {borrow
        ? "This book can't be shown in the app, but Open Library may lend it to you for free. "
        : "This book is still in copyright, so its text can't be shown here. "}
      {olKey && (
        <a href={`https://openlibrary.org${olKey}`} target="_blank" rel="noreferrer" className="link">
          {borrow ? "Borrow on Open Library ↗" : "See editions on Open Library ↗"}
        </a>
      )}
    </p>
  );
}
