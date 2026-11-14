"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import { spineLook } from "@/lib/spine";
import { useShelf } from "@/lib/store";
import type { BookResult, Status } from "@/lib/types";
import { useBookSearch } from "@/lib/useSearch";
import { BookCover } from "./BookCover";
import { Pot, Vase } from "./Decor";

const GOALS = [6, 12, 24, 36, 52];
const STEPS = ["Your goal", "Books you've read", "What's next"];

/** First visit: start your own shelf in three short steps, or look around a sample shelf. */
export function Welcome({ onDone }: { onDone: () => void }) {
  const books = useShelf((s) => s.books);
  const startOwn = useShelf((s) => s.startOwn);
  const loadSample = useShelf((s) => s.loadSample);
  const setGoal = useShelf((s) => s.setGoal);
  const year = new Date().getFullYear();
  const [step, setStep] = useState(0);
  const [goal, setGoalDraft] = useState(24);

  const begin = () => {
    startOwn();
    setStep(1);
  };

  return (
    <div className="mx-auto max-w-[760px] pt-6">
      {step > 0 && (
        <ol className="m-0 mb-10 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[13px]" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={`flex items-center gap-2 ${i + 1 === step ? "text-ink" : "text-label"}`}
              aria-current={i + 1 === step ? "step" : undefined}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-[11px] ${i + 1 <= step ? "bg-ink text-ground" : "border border-line-strong"}`}
              >
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      )}

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <div className="pt-6 text-center">
              <p className="eyebrow m-0">Welcome to Shelfie</p>
              <h1 className="m-0 mt-3 font-serif text-[48px] leading-[1.02] font-medium sm:text-[68px]">
                A quiet shelf for
                <br />
                the books in your life.
              </h1>
              <p className="mx-auto mt-5 mb-0 max-w-[520px] text-[15px] leading-relaxed text-muted">
                Keep what you&apos;re reading, what&apos;s next and what you&apos;ve finished on one oak shelf. Read classics right here,
                follow a yearly goal, and get suggestions for what to read next.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={begin}
                  className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border-0 bg-ink px-7 text-sm font-semibold text-ground"
                >
                  Start my shelf <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    loadSample();
                    onDone();
                  }}
                  className="h-12 cursor-pointer rounded-full border border-ink bg-transparent px-7 text-sm text-ink"
                >
                  Look around a sample shelf
                </button>
              </div>
              <p className="m-0 mt-5 text-xs text-label">No account. Everything stays in your browser.</p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="m-0 font-serif text-[40px] leading-tight font-medium sm:text-[52px]">
                How many books would you like to read in {year}?
              </h2>
              <p className="m-0 mt-3 text-[15px] text-muted">A gentle target. You can change it any time, and each year keeps its own.</p>
              <div className="mt-8 flex flex-wrap items-center gap-2.5" role="radiogroup" aria-label="Yearly goal">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={goal === g}
                    onClick={() => setGoalDraft(g)}
                    className={`h-14 min-w-16 cursor-pointer rounded-full border px-5 font-serif text-2xl transition-colors ${goal === g ? "border-ink bg-ink text-ground" : "border-line-strong bg-paper text-ink hover:border-ink"}`}
                  >
                    {g}
                  </button>
                ))}
                <label className="ml-2 flex items-center gap-2 text-sm text-muted">
                  or
                  <input
                    inputMode="numeric"
                    aria-label="Your own number"
                    value={GOALS.includes(goal) ? "" : String(goal)}
                    placeholder="other"
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/\D/g, "").slice(0, 3));
                      if (n > 0) setGoalDraft(n);
                    }}
                    className="h-12 w-20 border-0 border-b border-ink bg-transparent text-center font-serif text-2xl text-ink outline-none"
                  />
                </label>
              </div>
              <p className="m-0 mt-5 text-sm text-label">
                That&apos;s about {goal >= 12 ? `${Math.round(goal / 12)} a month` : `one every ${Math.round(12 / goal)} months`}.
              </p>
              <Nav
                onNext={() => {
                  setGoal(year, goal);
                  setStep(2);
                }}
              />
            </div>
          )}

          {step === 2 && (
            <AddStep
              title="Add a few books you've read and loved."
              note="They help the suggestions fit your taste. Three or four is plenty."
              status="finished"
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <AddStep
              title="What are you reading now, or want to read next?"
              note="Choose where each book goes. Classics in the public domain can be read right here."
              status="reading"
              choose
              onNext={onDone}
              last
            />
          )}
        </motion.section>
      </AnimatePresence>

      {step > 0 && <MiniShelf books={books} />}
    </div>
  );
}

function Nav({ onNext, last = false, skip }: { onNext: () => void; last?: boolean; skip?: boolean }) {
  return (
    <div className="mt-10 flex items-center gap-4">
      <button
        type="button"
        onClick={onNext}
        className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border-0 bg-ink px-7 text-sm font-semibold text-ground"
      >
        {last ? "Go to my shelf" : skip ? "Skip for now" : "Continue"} <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function AddStep({
  title,
  note,
  status: initial,
  choose = false,
  onNext,
  last = false,
}: {
  title: string;
  note: string;
  status: Status;
  choose?: boolean;
  onNext: () => void;
  last?: boolean;
}) {
  const books = useShelf((s) => s.books);
  const addBook = useShelf((s) => s.addBook);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>(initial);
  const { results, phase, active } = useBookSearch(query);
  const added = books.filter((b) => b.status === initial || (choose && b.status === "want"));
  const onShelf = (r: BookResult) => books.some((b) => (b.olKey && b.olKey === r.olKey) || b.title.toLowerCase() === r.title.toLowerCase());

  return (
    <div>
      <h2 className="m-0 font-serif text-[40px] leading-tight font-medium sm:text-[52px]">{title}</h2>
      <p className="m-0 mt-3 text-[15px] text-muted">{note}</p>

      <label className="mt-7 flex h-[52px] items-center gap-3 border-b border-ink">
        <Search size={18} strokeWidth={1.6} aria-hidden="true" />
        <span className="sr-only">Search by title or author</span>
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a title or author"
          className="min-w-0 flex-1 border-0 bg-transparent font-serif text-[24px] outline-none placeholder:text-label"
        />
        {phase === "loading" && <span className="text-xs text-label">Searching…</span>}
      </label>

      {choose && (
        <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Add as">
          {(["reading", "want"] as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              onClick={() => setStatus(s)}
              className={`h-9 cursor-pointer rounded-full border px-4 text-[13px] ${status === s ? "border-ink bg-ink text-ground" : "border-line-strong bg-transparent text-ink"}`}
            >
              {s === "reading" ? "Reading now" : "Want to read"}
            </button>
          ))}
        </div>
      )}

      {active && phase === "error" && (
        <p className="mt-4 text-sm text-clay-ink">Open Library didn&apos;t answer just now. Try again in a moment.</p>
      )}
      {active && (
        <ul className="m-0 mt-2 max-h-[300px] list-none overflow-y-auto p-0">
          {results.slice(0, 6).map((r) => {
            const there = onShelf(r);
            return (
              <li key={r.olKey} className="flex items-center gap-4 border-b border-line py-3">
                <BookCover title={r.title} author={r.author} coverId={r.coverId} width={34} height={50} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-serif text-[20px]">{r.title}</div>
                  <div className="truncate text-[13px] text-muted">
                    {r.author}
                    {r.year ? ` · ${r.year}` : ""}
                    {r.gutenbergId ? " · free to read here" : ""}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={there}
                  onClick={() => addBook(r, choose ? status : initial)}
                  className={`h-9 shrink-0 cursor-pointer rounded-full border border-ink px-4 text-[13px] disabled:cursor-default ${there ? "bg-ink text-ground" : "bg-transparent text-ink hover:bg-ink hover:text-ground"}`}
                >
                  {there ? "Added" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="m-0 mt-5 text-sm text-label">
        {added.length === 0 ? "Nothing added yet." : `${added.length} added: ${added.map((b) => b.title).join(", ")}`}
      </p>
      <Nav onNext={onNext} last={last} skip={!last && added.length === 0} />
    </div>
  );
}

/** The shelf filling up as books are added during the welcome steps. */
function MiniShelf({ books }: { books: { id: string; title: string; author: string; pages: number; status: Status }[] }) {
  return (
    <div className="mt-14" aria-hidden="true">
      <div className="flex h-[150px] items-end justify-center gap-[2px] overflow-hidden">
        <div className="mr-4 scale-75 origin-bottom">
          <Vase />
        </div>
        <AnimatePresence>
          {books.slice(-18).map((b) => {
            const look = spineLook(b);
            return (
              <motion.div
                key={b.id}
                initial={{ y: -120, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 15 }}
                style={{ width: look.width * 0.8, height: look.height * 0.55, background: look.color }}
              />
            );
          })}
        </AnimatePresence>
        {books.length === 0 && <div className="mb-3 text-xs text-label">Your shelf fills up as you add books</div>}
        <div className="ml-4 scale-75 origin-bottom">
          <Pot />
        </div>
      </div>
      <div className="mx-auto h-2.5 max-w-[620px] bg-oak" />
    </div>
  );
}
