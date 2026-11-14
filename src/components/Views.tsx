"use client";

import { AppShell } from "./AppShell";
import { LibraryPage } from "./LibraryPage";
import { NextPage } from "./NextPage";
import { ShelfPage } from "./ShelfPage";
import { YearPage } from "./YearPage";

export const ShelfView = () => (
  <AppShell>
    <ShelfPage />
  </AppShell>
);

export const NextView = () => (
  <AppShell>
    <NextPage />
  </AppShell>
);

export const YearView = () => (
  <AppShell>
    <YearPage />
  </AppShell>
);

export const LibraryView = () => (
  <AppShell>
    <LibraryPage />
  </AppShell>
);
