import { describe, expect, it } from "vitest";
import { sortPicks } from "../picks";
import type { Pick } from "../store";

const p = (title: string, pages: number | null, year: number | null): Pick => ({
  title,
  author: "A",
  reason: "",
  olKey: title,
  pages,
  year,
  coverId: null,
  tags: [],
});

describe("sortPicks", () => {
  const items = [p("long", 600, 2001), p("unknown", null, null), p("short", 180, 1950)];
  it("keeps the server order for best match", () => {
    expect(sortPicks(items, "match").map((x) => x.title)).toEqual(["long", "unknown", "short"]);
  });
  it("sorts by pages and year, unknowns last", () => {
    expect(sortPicks(items, "short").map((x) => x.title)).toEqual(["short", "long", "unknown"]);
    expect(sortPicks(items, "new").map((x) => x.title)).toEqual(["long", "short", "unknown"]);
    expect(sortPicks(items, "old").map((x) => x.title)).toEqual(["short", "long", "unknown"]);
  });
});
