"use client";

import { Download, RotateCcw, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { parseBackup, useShelf, type Backup } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { Modal } from "./Modal";

const when = (ts: number) =>
  new Date(ts).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Your data: download a backup, restore from a file, or go back to a copy saved before a big change. */
export function DataDialog() {
  const close = () => useUI.getState().setDataOpen(false);
  const showToast = useUI((s) => s.showToast);
  const { books, goals, journal, snapshots, isSample, restoreSnapshot, importBackup, clearSample, loadSample } = useShelf();
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const own = books.filter((b) => !b.id.startsWith("sample-")).length;

  const download = () => {
    const backup: Backup = { app: "shelfie", version: 2, exportedAt: Date.now(), books, goals, journal };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `shelfie-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded.");
  };

  const restoreFile = async (f: File) => {
    setError(null);
    try {
      const b = parseBackup(JSON.parse(await f.text()));
      if (!b) throw new Error("bad file");
      importBackup(b);
      showToast(`Restored ${b.books.length} books from your backup.`);
      close();
    } catch {
      setError("That file isn't a Shelfie backup.");
    }
  };

  return (
    <Modal label="Your data" onClose={close} className="w-full max-w-[640px]">
      <div data-card className="relative border border-[#e3dacb] bg-paper p-7 sm:p-11">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-4 right-4 grid size-10 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted hover:bg-ground hover:text-ink"
        >
          <X size={18} />
        </button>
        <h2 className="m-0 font-serif text-[36px] font-medium">Your data</h2>
        <p className="m-0 mt-2 text-sm leading-relaxed text-muted">
          Your shelf lives in this browser only. Download a backup to keep it safe or move it to another device. Shelfie also keeps a copy
          automatically before clearing, importing or restoring.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={download}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-ink px-5 text-sm font-semibold text-ground"
          >
            <Download size={15} aria-hidden="true" /> Download backup
          </button>
          <button
            type="button"
            onClick={() => file.current?.click()}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-ink bg-transparent px-5 text-sm text-ink"
          >
            <Upload size={15} aria-hidden="true" /> Restore from a file
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && restoreFile(e.target.files[0])}
          />
        </div>
        {error && (
          <p role="alert" className="m-0 mt-3 text-sm text-clay-ink">
            {error}
          </p>
        )}

        <div className="mt-9">
          <p className="eyebrow m-0">Saved copies</p>
          {snapshots.length === 0 ? (
            <p className="m-0 mt-2 text-sm text-muted">None yet. A copy is saved before anything that removes a lot at once.</p>
          ) : (
            <ul className="m-0 mt-2 list-none p-0">
              {snapshots.map((s) => (
                <li key={s.at} className="flex items-center gap-4 border-b border-line py-3">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm text-ink">{s.label}</p>
                    <p className="m-0 text-xs text-label">
                      {when(s.at)} · {s.books.length} book{s.books.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      restoreSnapshot(s.at);
                      showToast(`Shelf restored to ${when(s.at)}.`);
                      close();
                    }}
                    className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-transparent px-3.5 text-[13px] text-ink hover:border-ink"
                  >
                    <RotateCcw size={13} aria-hidden="true" /> Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-9">
          <p className="eyebrow m-0">Sample books</p>
          {isSample ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span>Removes only the sample books. {own > 0 ? `Your ${own} book${own === 1 ? "" : "s"} stay.` : ""}</span>
              <button
                type="button"
                onClick={() => {
                  if (!confirmClear) return setConfirmClear(true);
                  clearSample();
                  showToast("Sample books cleared. A copy was saved in Your data.");
                  close();
                }}
                className={`h-9 cursor-pointer rounded-full border px-3.5 text-[13px] ${confirmClear ? "border-clay bg-clay text-white" : "border-line-strong bg-transparent text-ink"}`}
              >
                {confirmClear ? "Click again to clear" : "Clear sample books"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                loadSample();
                showToast("Sample books added next to yours.");
                close();
              }}
              className="link mt-2 cursor-pointer border-0 bg-transparent p-0 text-sm"
            >
              Add the sample books back
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
