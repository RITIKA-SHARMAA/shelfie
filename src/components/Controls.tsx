"use client";

import { motion } from "framer-motion";
import { BookOpen, Bookmark, Check, Star } from "lucide-react";
import { useId } from "react";
import { STATUS_LABEL, type Status } from "@/lib/types";

const STATUS_ICON = { want: Bookmark, reading: BookOpen, finished: Check } as const;
const ORDER: Status[] = ["want", "reading", "finished"];

/** A segmented control for a book's status: three buttons, the active one filled. */
export function StatusPicker({
  value,
  onChange,
  label = "Status",
  size = "md",
}: {
  value: Status;
  onChange: (s: Status) => void;
  label?: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-full border border-line-strong bg-ground/70 p-1"
    >
      {ORDER.map((s) => {
        const Icon = STATUS_ICON[s];
        const on = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s)}
            className={`relative inline-flex cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent font-medium transition-colors ${size === "sm" ? "h-9 px-3.5 text-[13px]" : "h-10 px-4 text-sm"} ${on ? "text-ground" : "text-muted hover:text-ink"}`}
          >
            {on && (
              <motion.span
                layoutId={`status-pill-${id}`}
                className="absolute inset-0 rounded-full bg-ink shadow-[0_6px_14px_-8px_rgba(43,38,32,0.6)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon size={15} strokeWidth={1.9} aria-hidden="true" className="relative" />
            <span className="relative whitespace-nowrap">{STATUS_LABEL[s]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Pill chips for a single choice, e.g. moods or filters. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`h-10 cursor-pointer rounded-full border px-[18px] text-sm transition-colors ${on ? "border-ink bg-ink text-ground" : "border-line-strong bg-paper text-[#4a4239] hover:border-ink"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Community rating from Open Library, e.g. ★ 4.2 (416 ratings). */
export function RatingLine({ rating }: { rating: { average: number; count: number } | null }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
      <Star size={14} strokeWidth={1.6} className="fill-[#c99a5b] text-[#c99a5b]" aria-hidden="true" />
      <span className="font-semibold text-ink">{rating.average.toFixed(1)}</span>
      <span>
        ({rating.count.toLocaleString("en-IN")} rating{rating.count === 1 ? "" : "s"} on Open Library)
      </span>
    </span>
  );
}
