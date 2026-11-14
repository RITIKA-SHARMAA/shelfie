"use client";

import { useShelf } from "./store";
import { STATUS_LABEL, type Status } from "./types";
import { useUI } from "./ui";

/**
 * What happens after the visitor acts on a book. The dialog closes, a toast
 * says what changed and offers Undo, and the journey continues: finishing a
 * book opens a small celebration, and starting a free book opens the reader.
 */
const ui = () => useUI.getState();
const shelf = () => useShelf.getState();

const undoable = (text: string) => {
  const { books, journal } = shelf();
  return () =>
    ui().showToast(text, () => {
      shelf().restoreBooks(books, journal);
      ui().closeCelebrate();
    });
};

const changeStatus = (id: string, status: Status) => {
  const book = shelf().books.find((b) => b.id === id);
  if (!book || book.status === status) return;
  const toast = undoable(`Moved “${book.title}” to ${STATUS_LABEL[status].toLowerCase()}.`);
  shelf().setStatus(id, status);
  toast();
  if (status === "finished") ui().celebrate(id);
  else if (status === "reading" && book.gutenbergId) ui().openReader(id);
  else ui().closeBook();
};

const remove = (id: string) => {
  const book = shelf().books.find((b) => b.id === id);
  if (!book) return;
  const toast = undoable(`Removed “${book.title}” from your shelf.`);
  shelf().removeBook(id);
  ui().closeBook();
  toast();
};

export const bookActions = { changeStatus, remove };
