"use client";

import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { countWord } from "@/lib/stats";
import { goalFor, useShelf } from "@/lib/store";

/** Thin progress ring for a year's reading goal, with an Edit goal button. Each year keeps its own goal. */
export function GoalRing({ done, year, showLink = true }: { done: number; year: number; showLink?: boolean }) {
  const goal = useShelf((s) => goalFor(s.goals, year));
  const setGoalFor = useShelf((s) => s.setGoal);
  const setGoal = (n: number) => setGoalFor(year, n);
  const past = year < new Date().getFullYear();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(goal));
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, done / goal);
  const left = Math.max(0, goal - done);

  const startEdit = () => {
    setDraft(String(goal));
    setEditing(true);
  };

  const save = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) setGoal(n);
    else setDraft(String(goal));
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-[22px]">
      <svg
        width="124"
        height="124"
        viewBox="0 0 124 124"
        role="img"
        aria-label={`${done} of ${goal} books read in ${year}`}
        className="shrink-0"
      >
        <circle cx="62" cy="62" r={r} fill="none" stroke="#ddd3c3" strokeWidth="3" />
        <motion.circle
          cx="62"
          cy="62"
          r={r}
          fill="none"
          stroke="#2b2620"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          transform="rotate(-90 62 62)"
        />
        <circle cx="62" cy="62" r="44" fill="none" stroke="#e6ddcf" strokeWidth="1" />
        <text x="62" y="66" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="40" fill="#2b2620">
          {done}
        </text>
        <text x="62" y="86" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="11" letterSpacing="1.5" fill="#8c8273">
          OF {goal}
        </text>
      </svg>
      <div>
        <div className="flex items-center gap-2">
          <p className="eyebrow m-0">{year} goal</p>
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-line-strong bg-transparent px-2.5 text-[11px] text-muted hover:border-ink hover:text-ink"
            >
              <Pencil size={11} strokeWidth={2} aria-hidden="true" />
              Edit goal
            </button>
          )}
        </div>
        {editing ? (
          <form
            className="mt-1.5 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label htmlFor={`goal-${year}`} className="text-sm text-muted">
              Books to read in {year}
            </label>
            <input
              id={`goal-${year}`}
              autoFocus
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onBlur={save}
              className="h-9 w-16 border-0 border-b border-ink bg-transparent text-center font-serif text-2xl outline-none"
            />
            <button type="submit" className="h-8 cursor-pointer rounded-full border-0 bg-ink px-3 text-xs text-ground">
              Save
            </button>
          </form>
        ) : (
          <p className="m-0 mt-1 font-serif text-[26px] text-ink">{done === 1 ? "One book read" : `${countWord(done)} books read`}</p>
        )}
        <div className="mt-1 text-[13px] text-muted">
          {left === 0 ? "Goal reached. Lovely." : past ? `${left} short of the goal` : `${left} to go before the year ends`}
        </div>
        {showLink && (
          <Link href="/year" className="link mt-2 inline-block border-0 text-[13px]">
            See your year →
          </Link>
        )}
      </div>
    </div>
  );
}
