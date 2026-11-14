"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useUI } from "@/lib/ui";

/** A small note at the bottom of the screen after an action, with Undo when it can be reversed. */
export function Toast() {
  const toast = useUI((s) => s.toast);
  const hide = useUI((s) => s.hideToast);
  // Sit above the reader's page controls while a book is open.
  const reading = useUI((s) => s.readerId !== null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hide, toast.undo ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [toast, hide]);

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4 ${reading ? "bottom-24" : "bottom-5"}`}
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className="pointer-events-auto flex max-w-[560px] items-center gap-4 rounded-full bg-ink py-2.5 pr-2.5 pl-5 text-sm text-ground shadow-[0_18px_40px_-18px_rgba(43,38,32,0.7)]"
          >
            <span className="min-w-0">{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  hide();
                }}
                className="h-8 shrink-0 cursor-pointer rounded-full border border-[#8c8273] bg-transparent px-3.5 text-[13px] font-semibold text-ground hover:bg-white/10"
              >
                Undo
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={hide}
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-[#c9bfae] hover:text-ground"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
