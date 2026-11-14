"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Calm overlay dialog: Escape or a click anywhere outside the card closes it,
 * focus moves inside, and the page behind doesn't scroll. Mark the visible
 * card with `data-card`; everything else in the overlay counts as outside.
 */
export function Modal({
  label,
  onClose,
  children,
  className = "",
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("[data-autofocus], input, button")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(43,38,32,0.28)] px-4 py-8 backdrop-blur-[2px] sm:py-14"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.button === 0 && !(e.target as HTMLElement).closest("[data-card]")) onClose();
      }}
    >
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`mx-auto ${className}`}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
