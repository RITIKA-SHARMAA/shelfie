"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bookActions } from "@/lib/actions";
import { spineLook } from "@/lib/spine";
import { countWord, finishedInYear } from "@/lib/stats";
import { goalFor, shelfOrder, useShelf } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { Modal } from "./Modal";

/** After finishing a book: a small moment, a rating, a line to keep, and what to read next. */
export function Celebrate({ id }: { id: string }) {
  const book = useShelf((s) => s.books.find((b) => b.id === id));
  const books = useShelf((s) => s.books);
  const goals = useShelf((s) => s.goals);
  const update = useShelf((s) => s.updateBook);
  const close = useUI((s) => s.closeCelebrate);
  const router = useRouter();
  const [line, setLine] = useState("");
  const [now] = useState(() => Date.now());

  if (!book) return null;
  const year = new Date(book.finishedAt ?? now).getFullYear();
  const done = finishedInYear(books, year).length;
  const goal = goalFor(goals, year);
  const next = shelfOrder(books).find((b) => b.status === "want");
  const look = spineLook(book, "finished");

  const keepLine = () => {
    const t = line.trim();
    if (t) update(book.id, { notes: book.notes ? `${book.notes}\n${t}` : t });
  };
  const finish = (then?: () => void) => {
    keepLine();
    close();
    then?.();
  };

  return (
    <Modal label={`Finished ${book.title}`} onClose={() => finish()} className="w-full max-w-[560px]">
      <div data-card className="relative overflow-hidden border border-[#e3dacb] bg-paper px-8 pt-10 pb-8 text-center sm:px-12">
        {/* the book settles onto a small shelf */}
        <div className="mx-auto flex h-[120px] w-max items-end gap-[2px]">
          {["#e8e0d1", "#a7b39a"].map((c, i) => (
            <div key={i} style={{ width: 20 + i * 4, height: 84 + i * 8, background: c }} />
          ))}
          <motion.div
            initial={{ y: -120, rotate: -12, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 13, delay: 0.1 }}
            className="ml-1 flex items-center justify-center"
            style={{ width: 30, height: 112, background: look.color }}
          >
            <span
              className="max-h-[85%] overflow-hidden text-[10px] tracking-[0.08em] whitespace-nowrap [writing-mode:vertical-rl] rotate-180"
              style={{ color: look.ink }}
            >
              {book.title}
            </span>
          </motion.div>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="absolute size-2 rounded-full bg-sage"
              initial={{ opacity: 0, y: 0, x: 0 }}
              animate={{ opacity: [0, 1, 0], y: -50 - i * 14, x: (i - 1) * 46 }}
              transition={{ duration: 1.3, delay: 0.5 + i * 0.12 }}
              style={{ left: "50%", top: 80 }}
            />
          ))}
        </div>
        <div className="mx-auto h-2 w-48 bg-oak" />

        <p className="eyebrow m-0 mt-7 text-sage">Finished</p>
        <h2 className="m-0 mt-2 font-serif text-[38px] leading-tight font-medium">{book.title}</h2>
        <p className="m-0 mt-2 text-sm text-muted">
          {countWord(done)} book{done === 1 ? "" : "s"} in {year}
          {done >= goal ? ", and your goal is reached." : `, ${goal - done} to go for your goal.`}
        </p>

        <div className="mt-7">
          <p className="eyebrow m-0">How was it?</p>
          <div role="radiogroup" aria-label="Rating" className="mt-1.5 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={book.rating === n}
                aria-label={`${n} of 5`}
                onClick={() => update(book.id, { rating: n })}
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

        <label className="mt-4 block text-left">
          <span className="eyebrow">A line to remember (optional)</span>
          <input
            value={line}
            onChange={(e) => setLine(e.target.value.slice(0, 280))}
            placeholder="What stayed with you?"
            className="mt-1.5 h-11 w-full border-0 border-b border-line-strong bg-transparent font-serif text-xl outline-none focus:border-ink"
          />
        </label>

        <div className="mt-8 border-t border-line pt-6 text-left">
          <p className="eyebrow m-0">What next?</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {next && (
              <button
                type="button"
                onClick={() => finish(() => bookActions.changeStatus(next.id, "reading"))}
                className="h-11 cursor-pointer rounded-full border-0 bg-ink px-5 text-sm font-semibold text-ground"
              >
                Start “{next.title.length > 28 ? next.title.slice(0, 27) + "…" : next.title}”
              </button>
            )}
            <button
              type="button"
              onClick={() => finish(() => router.push("/next"))}
              className={`h-11 cursor-pointer rounded-full px-5 text-sm ${next ? "border border-ink bg-transparent text-ink" : "border-0 bg-ink font-semibold text-ground"}`}
            >
              Get suggestions
            </button>
            <button
              type="button"
              onClick={() => finish()}
              className="h-11 cursor-pointer border-0 bg-transparent px-2 text-sm text-muted hover:text-ink"
            >
              Back to the shelf
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
