import { create } from "zustand";
import type { BookResult, Status } from "./types";

export type InfoBook = BookResult & { reason?: string };

export interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

/** Which dialog is open, plus the toast. Not saved: a refresh starts with everything closed. */
interface UI {
  addOpen: boolean;
  addQuery: string;
  addStatus: Status;
  bookId: string | null;
  /** A book that isn't on the shelf yet (an AI suggestion), shown in the "About" dialog. */
  info: InfoBook | null;
  readerId: string | null;
  celebrateId: string | null;
  dataOpen: boolean;
  toast: Toast | null;
  openAdd: (query?: string, status?: Status) => void;
  closeAdd: () => void;
  openBook: (id: string) => void;
  closeBook: () => void;
  openInfo: (b: InfoBook) => void;
  closeInfo: () => void;
  openReader: (id: string) => void;
  closeReader: () => void;
  celebrate: (id: string) => void;
  closeCelebrate: () => void;
  setDataOpen: (open: boolean) => void;
  showToast: (text: string, undo?: () => void) => void;
  hideToast: () => void;
}

let toastId = 0;

export const useUI = create<UI>((set) => ({
  addOpen: false,
  addQuery: "",
  addStatus: "want",
  bookId: null,
  info: null,
  readerId: null,
  celebrateId: null,
  dataOpen: false,
  toast: null,
  openAdd: (query = "", status = "want") => set({ addOpen: true, addQuery: query, addStatus: status, bookId: null, info: null }),
  closeAdd: () => set({ addOpen: false }),
  openBook: (id) => set({ bookId: id, addOpen: false, info: null }),
  closeBook: () => set({ bookId: null }),
  openInfo: (b) => set({ info: b, bookId: null }),
  closeInfo: () => set({ info: null }),
  openReader: (id) => set({ readerId: id, bookId: null, info: null, celebrateId: null }),
  closeReader: () => set({ readerId: null }),
  celebrate: (id) => set({ celebrateId: id, bookId: null, readerId: null }),
  closeCelebrate: () => set({ celebrateId: null }),
  setDataOpen: (dataOpen) => set({ dataOpen }),
  showToast: (text, undo) => set({ toast: { id: ++toastId, text, undo } }),
  hideToast: () => set({ toast: null }),
}));
