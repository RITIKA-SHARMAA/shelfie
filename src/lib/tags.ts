/**
 * Open Library gives each book dozens of free-text "subjects". This turns them
 * into a handful of tidy tags with simple keyword rules, so tags stay
 * consistent across books and no AI call is needed.
 */

export const TAGS = ["Fiction", "Sci-fi", "Fantasy", "Self-help", "Business", "Tech", "Science", "History", "Memoir", "Classics"] as const;
export type Tag = (typeof TAGS)[number];

const RULES: { tag: Tag; any: string[]; none?: string[] }[] = [
  { tag: "Sci-fi", any: ["science fiction", "sci-fi", "space opera", "dystopia", "time travel", "robots"] },
  { tag: "Fantasy", any: ["fantasy", "magic", "dragons", "wizards", "elves"] },
  {
    tag: "Self-help",
    any: ["self-help", "self help", "habit", "personal development", "success", "happiness", "motivation", "productivity"],
  },
  { tag: "Business", any: ["business", "economics", "finance", "money", "investing", "management", "entrepreneur"] },
  { tag: "Tech", any: ["computer", "programming", "software", "technology", "data processing", "algorithms", "engineering"] },
  { tag: "Science", any: ["science", "physics", "psychology", "biology", "evolution", "astronomy"], none: ["science fiction"] },
  { tag: "History", any: ["history", "historical"] },
  { tag: "Memoir", any: ["biography", "autobiography", "memoir"] },
  { tag: "Classics", any: ["classic literature", "classics", "classic"] },
  { tag: "Fiction", any: ["fiction", "novel", "short stories"], none: ["nonfiction", "non-fiction"] },
];

export function tagsFromSubjects(subjects: string[] | undefined, max = 3): Tag[] {
  if (!subjects?.length) return [];
  const text = subjects.join(" | ").toLowerCase();
  const out: Tag[] = [];
  for (const rule of RULES) {
    if (out.length >= max) break;
    // Strip excluded phrases first, so "science" inside "science fiction" doesn't count as Science.
    const haystack = (rule.none ?? []).reduce((t, phrase) => t.split(phrase).join(" "), text);
    if (rule.any.some((w) => haystack.includes(w))) out.push(rule.tag);
  }
  return out;
}

/** Tags in use on a shelf, most common first, for the filter row. */
export function shelfTags(books: { tags: string[] }[]): string[] {
  const counts = new Map<string, number>();
  for (const b of books) for (const t of b.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}
