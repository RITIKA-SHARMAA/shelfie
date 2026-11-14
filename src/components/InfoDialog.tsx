"use client";

import { X } from "lucide-react";
import { bookActions } from "@/lib/actions";
import { useShelf } from "@/lib/store";
import { useUI, type InfoBook } from "@/lib/ui";
import { useDetails } from "@/lib/useDetails";
import { BookAbout } from "./BookAbout";
import { BookCover } from "./BookCover";
import { Modal } from "./Modal";

/** A book that isn't on the shelf yet (an AI suggestion): what it's about, and a choice. */
export function InfoDialog({ book }: { book: InfoBook }) {
  const close = useUI((s) => s.closeInfo);
  const openBook = useUI((s) => s.openBook);
  const showToast = useUI((s) => s.showToast);
  const addBook = useShelf((s) => s.addBook);
  const dismissPick = useShelf((s) => s.dismissPick);
  const onShelf = useShelf((s) =>
    s.books.find((b) => (b.olKey && b.olKey === book.olKey) || b.title.toLowerCase() === book.title.toLowerCase()),
  );
  const { details, phase } = useDetails(book);
  const free = book.gutenbergId ?? details?.gutenbergId ?? null;

  const add = (status: "want" | "reading") => {
    const id = addBook({ ...book, gutenbergId: free, coverId: book.coverId ?? details?.coverId ?? null }, "want");
    if (status === "reading") bookActions.changeStatus(id, "reading");
    else showToast(`Added “${book.title}” to want to read.`);
    close();
  };

  return (
    <Modal label={`${book.title} by ${book.author}`} onClose={close} className="w-full max-w-[720px]">
      <div data-card className="relative border border-[#e3dacb] bg-paper p-7 sm:p-11">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-4 right-4 grid size-10 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted hover:bg-ground hover:text-ink"
        >
          <X size={18} />
        </button>
        <div className="flex flex-wrap items-end gap-7">
          <BookCover
            title={book.title}
            author={book.author}
            coverId={book.coverId ?? details?.coverId ?? null}
            width={112}
            height={168}
            size="md"
            className="shadow-[0_16px_24px_-14px_rgba(60,35,15,0.45)]"
          />
          <div className="min-w-0 flex-1">
            <p className="eyebrow m-0 text-sage">{book.reason ? "Suggested for you" : "About this book"}</p>
            <h2 className="m-0 mt-2 font-serif text-[38px] leading-[1.02] font-medium">{book.title}</h2>
            <p className="m-0 mt-1.5 text-sm text-muted">{book.author}</p>
          </div>
        </div>

        {book.reason && <p className="m-0 mt-6 border-l-2 border-sage pl-4 text-[15px] leading-relaxed text-[#4a4239]">{book.reason}</p>}

        <div className="mt-6">
          <BookAbout details={details} phase={phase} />
        </div>

        {free && <p className="m-0 mt-5 text-[13px] text-sage">Free to read inside Shelfie (public domain).</p>}

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
          {onShelf ? (
            <button
              type="button"
              onClick={() => openBook(onShelf.id)}
              className="h-11 cursor-pointer rounded-full border-0 bg-ink px-6 text-sm font-semibold text-ground"
            >
              Open it on your shelf
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => add("want")}
                className="h-11 cursor-pointer rounded-full border-0 bg-ink px-6 text-sm font-semibold text-ground"
              >
                Add to want to read
              </button>
              <button
                type="button"
                onClick={() => add("reading")}
                className="h-11 cursor-pointer rounded-full border border-ink bg-transparent px-6 text-sm text-ink"
              >
                {free ? "Start reading now" : "I'm reading it now"}
              </button>
              {book.reason && (
                <button
                  type="button"
                  onClick={() => {
                    dismissPick(book.title);
                    close();
                  }}
                  className="h-11 cursor-pointer border-0 bg-transparent px-2 text-sm text-muted hover:text-ink"
                >
                  Not for me
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
