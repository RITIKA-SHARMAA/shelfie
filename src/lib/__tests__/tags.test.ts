import { describe, expect, it } from "vitest";
import { shelfTags, tagsFromSubjects } from "../tags";

describe("tags from Open Library subjects", () => {
  it("maps free-text subjects to tidy tags", () => {
    expect(tagsFromSubjects(["Habit", "Self-actualization (Psychology)", "Success"])).toEqual(["Self-help", "Science"]);
    expect(tagsFromSubjects(["Computer software -- Development", "Programming"])).toEqual(["Tech"]);
  });

  it("does not count 'science' inside 'science fiction' as Science", () => {
    expect(tagsFromSubjects(["Science fiction", "Space travel"])).toEqual(["Sci-fi", "Fiction"]);
  });

  it("does not tag nonfiction as Fiction", () => {
    expect(tagsFromSubjects(["Nonfiction", "History, Modern"])).toEqual(["History"]);
  });

  it("caps the number of tags and handles missing subjects", () => {
    expect(tagsFromSubjects(["fantasy", "magic", "history", "biography", "classic", "fiction", "business"]).length).toBe(3);
    expect(tagsFromSubjects(undefined)).toEqual([]);
  });

  it("orders shelf tags by how often they appear", () => {
    expect(shelfTags([{ tags: ["Tech"] }, { tags: ["Fiction", "Tech"] }, { tags: ["Fiction"] }, { tags: ["Tech"] }])).toEqual([
      "Tech",
      "Fiction",
    ]);
  });
});
