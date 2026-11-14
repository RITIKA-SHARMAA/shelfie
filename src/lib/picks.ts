import type { Pick } from "./store";

export type PickSort = "match" | "short" | "new" | "old";

/** Re-order suggestions on the client. "match" keeps the server's order (mood fit first). Unknown values go last. */
export function sortPicks(items: Pick[], sort: PickSort): Pick[] {
  const list = [...items];
  if (sort === "short") list.sort((a, b) => (a.pages ?? 1e9) - (b.pages ?? 1e9));
  if (sort === "new") list.sort((a, b) => (b.year ?? -1e9) - (a.year ?? -1e9));
  if (sort === "old") list.sort((a, b) => (a.year ?? 1e9) - (b.year ?? 1e9));
  return list;
}
