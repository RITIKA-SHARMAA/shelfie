import { describe, expect, it } from "vitest";
import { coverLook, hash, spineLook } from "../spine";

const book = { title: "Deep Work", author: "Cal Newport", pages: 296, status: "finished" as const };

describe("spine look", () => {
  it("is deterministic for the same book", () => {
    expect(spineLook(book)).toEqual(spineLook({ ...book }));
    expect(hash("abc")).toBe(hash("abc"));
    expect(hash("abc")).not.toBe(hash("abd"));
  });

  it("makes longer books taller and thicker, within bounds", () => {
    const short = spineLook({ ...book, pages: 120 });
    const long = spineLook({ ...book, pages: 900 });
    expect(long.width).toBeGreaterThan(short.width);
    expect(long.height).toBeGreaterThan(short.height);
    for (const s of [short, long]) {
      expect(s.height).toBeGreaterThanOrEqual(145);
      expect(s.height).toBeLessThanOrEqual(215);
      expect(s.width).toBeGreaterThanOrEqual(24);
      expect(s.width).toBeLessThanOrEqual(46);
    }
  });

  it("uses pale colours for want-to-read books", () => {
    const deep = spineLook(book, "finished");
    const pale = spineLook(book, "want");
    const lightness = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    expect(lightness(pale.color)).toBeGreaterThan(lightness(deep.color));
  });

  it("falls back to a sensible size when the page count is unknown", () => {
    expect(spineLook({ ...book, pages: 0 }).width).toBe(spineLook({ ...book, pages: 250 }).width);
  });

  it("gives covers a stable colour pair", () => {
    expect(coverLook(book)).toEqual(coverLook(book));
  });
});
