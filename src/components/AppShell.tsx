"use client";

import { AnimatePresence } from "framer-motion";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useUI } from "@/lib/ui";
import { AddDialog } from "./AddDialog";
import { BookDialog } from "./BookDialog";
import { Celebrate } from "./Celebrate";
import { DataDialog } from "./DataDialog";
import { Logo } from "./Decor";
import { InfoDialog } from "./InfoDialog";
import { Reader } from "./Reader";
import { Toast } from "./Toast";

const NAV = [
  { href: "/", label: "Shelf" },
  { href: "/library", label: "Library" },
  { href: "/next", label: "Read next" },
  { href: "/year", label: "Year" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const addOpen = useUI((s) => s.addOpen);
  const bookId = useUI((s) => s.bookId);
  const info = useUI((s) => s.info);
  const readerId = useUI((s) => s.readerId);
  const celebrateId = useUI((s) => s.celebrateId);
  const dataOpen = useUI((s) => s.dataOpen);
  const setDataOpen = useUI((s) => s.setDataOpen);
  const openAdd = useUI((s) => s.openAdd);
  const [query, setQuery] = useState("");

  // "/" focuses search, like many reading apps; ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(t.tagName)) {
        e.preventDefault();
        document.getElementById("header-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh bg-ground font-sans text-ink">
      <div className="mx-auto max-w-[1160px] px-6 pb-20">
        <header className="flex flex-wrap items-center gap-x-9 gap-y-4 py-8">
          <Link href="/" className="text-ink no-underline">
            <Logo />
          </Link>
          <nav aria-label="Main" className="flex gap-7 text-sm">
            {NAV.map((n) => {
              const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className={`pb-1 no-underline ${on ? "border-b border-ink text-ink" : "text-muted hover:text-ink"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <form
            role="search"
            className="ml-auto flex h-11 w-full items-center gap-2.5 border-b border-line-strong sm:w-[280px]"
            onSubmit={(e) => {
              e.preventDefault();
              openAdd(query.trim());
              setQuery("");
            }}
          >
            <Search size={16} strokeWidth={1.8} className="text-muted" aria-hidden="true" />
            <label htmlFor="header-search" className="sr-only">
              Find a book to add
            </label>
            <input
              id="header-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a book"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-label"
            />
          </form>
          <button
            type="button"
            onClick={() => openAdd()}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-ink bg-transparent px-5 text-sm text-ink transition-colors hover:bg-ink hover:text-ground"
          >
            <Plus size={14} strokeWidth={2} aria-hidden="true" />
            Add book
          </button>
        </header>
        <main>{children}</main>
        <footer className="mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-xs text-label">
          <span>Your shelf is saved in this browser. Book data from Open Library; free classics from Project Gutenberg.</span>
          <button type="button" onClick={() => setDataOpen(true)} className="link cursor-pointer border-0 bg-transparent p-0 text-xs">
            Your data: backup and restore
          </button>
        </footer>
      </div>
      <AnimatePresence>
        {addOpen && <AddDialog key="add" />}
        {bookId && <BookDialog key={bookId} id={bookId} />}
        {info && <InfoDialog key={`info-${info.olKey || info.title}`} book={info} />}
        {celebrateId && <Celebrate key={`done-${celebrateId}`} id={celebrateId} />}
        {dataOpen && <DataDialog key="data" />}
        {readerId && <Reader key={`read-${readerId}`} id={readerId} />}
      </AnimatePresence>
      <Toast />
    </div>
  );
}
