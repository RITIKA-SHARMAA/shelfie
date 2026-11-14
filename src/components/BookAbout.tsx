"use client";

import { useState } from "react";
import type { BookDetails } from "@/lib/types";
import { RatingLine } from "./Controls";

/** The "About this book" block: rating, first published, awards, a short summary and themes. */
export function BookAbout({ details, phase }: { details: BookDetails | null; phase: "loading" | "error" | "done" }) {
  const [open, setOpen] = useState(false);

  if (phase === "loading" && !details)
    return (
      <div className="space-y-2.5" aria-label="Loading details">
        <div className="shimmer h-4 w-1/2" />
        <div className="shimmer h-4 w-full" />
        <div className="shimmer h-4 w-11/12" />
        <div className="shimmer h-4 w-2/3" />
      </div>
    );
  if (!details)
    return (
      <p className="m-0 text-sm text-muted">Couldn&apos;t load details from Open Library just now. Try opening the book again later.</p>
    );

  const facts = [details.year ? `First published ${details.year}` : null, details.pages ? `about ${details.pages} pages` : null].filter(
    Boolean,
  );
  const long = (details.summary?.length ?? 0) > 260;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <RatingLine rating={details.rating} />
        <span className="text-[13px] text-muted">{facts.join(" · ")}</span>
      </div>
      {details.awards.length > 0 && <p className="m-0 text-[13px] text-sage">Awards: {details.awards.join(", ")}</p>}
      {details.summary ? (
        <div>
          <p
            className={`m-0 font-serif text-[19px] leading-[1.5] whitespace-pre-line text-[#3d362e] ${!open && long ? "line-clamp-5" : ""}`}
          >
            {details.summary}
          </p>
          <p className="m-0 mt-1.5 flex flex-wrap gap-x-3 text-xs text-label">
            {long && (
              <button type="button" onClick={() => setOpen(!open)} className="link cursor-pointer border-0 bg-transparent p-0 text-xs">
                {open ? "Show less" : "Read more"}
              </button>
            )}
            <span>
              {details.summarySource === "ai" ? "Summary written by AI, as Open Library has none" : "Description from Open Library"}
            </span>
          </p>
        </div>
      ) : details.firstSentence ? (
        <p className="m-0 font-serif text-[19px] leading-[1.5] text-[#3d362e] italic">It begins: “{details.firstSentence}”</p>
      ) : (
        <p className="m-0 text-sm text-muted">Open Library has no description for this book yet.</p>
      )}
      {details.themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Themes">
          {details.themes.map((t) => (
            <span key={t} className="rounded-full bg-ground px-2.5 py-1 text-xs text-muted">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
