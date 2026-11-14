"use client";

import { useState } from "react";
import { coverUrl } from "@/lib/openlibrary";
import { coverLook } from "@/lib/spine";

interface Props {
  title: string;
  author: string;
  coverId: number | null;
  width: number;
  height: number;
  className?: string;
  /** Larger type for big covers. */
  size?: "sm" | "md" | "lg";
}

/** Real cover from Open Library when there is one, otherwise a calm generated cover. */
export function BookCover({ title, author, coverId, width, height, className = "", size = "md" }: Props) {
  const [failed, setFailed] = useState(false);
  const look = coverLook({ title, author });
  const titleSize = size === "lg" ? "text-[22px]" : size === "md" ? "text-[16px]" : "text-[10px]";

  if (coverId && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- covers come straight from Open Library's CDN
      <img
        src={coverUrl(coverId, size === "sm" ? "S" : "M")}
        alt={`Cover of ${title}`}
        width={width}
        height={height}
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
        style={{ width, height, background: look.color }}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width, height, background: look.color, color: look.ink }}
      role="img"
      aria-label={`${title} by ${author}`}
    >
      <span className={`absolute top-[9%] right-[10%] left-[12%] font-serif leading-[1.05] font-semibold ${titleSize}`}>{title}</span>
      {size !== "sm" && <span className="absolute bottom-[9%] left-[12%] text-[9px] tracking-[0.14em] uppercase opacity-90">{author}</span>}
    </div>
  );
}
