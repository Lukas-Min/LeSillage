import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANNOUNCEMENT,
  marqueeCopies,
  parseAnnouncement,
} from "@/domain/announcement";

describe("marqueeCopies", () => {
  // The whole point of the calculation: whatever the widths, the copies left
  // behind the one being scrolled away must still cover the bar.
  const coversBar = (barWidth: number, copyWidth: number) =>
    (marqueeCopies(barWidth, copyWidth) - 1) * copyWidth >= barWidth;

  it("never drops below two copies", () => {
    expect(marqueeCopies(0, 1429)).toBe(2);
    expect(marqueeCopies(300, 1429)).toBe(2);
  });

  it("adds copies once the bar is wider than one copy", () => {
    // The real regression: 1429px of messages on a 1920px monitor.
    expect(marqueeCopies(1920, 1429)).toBe(3);
    expect(marqueeCopies(2560, 1429)).toBe(3);
    expect(marqueeCopies(2560, 300)).toBe(10);
  });

  it("keeps the track covering the bar across a range of widths", () => {
    for (const barWidth of [320, 768, 1024, 1440, 1920, 2560, 3440]) {
      for (const copyWidth of [180, 300, 700, 1429, 4000]) {
        expect(coversBar(barWidth, copyWidth)).toBe(true);
      }
    }
  });

  it("handles a bar exactly one copy wide without a gap", () => {
    expect(coversBar(1429, 1429)).toBe(true);
    expect(coversBar(1430, 1429)).toBe(true);
  });

  it("falls back safely on unusable measurements", () => {
    expect(marqueeCopies(1920, 0)).toBe(2);
    expect(marqueeCopies(Number.NaN, 1429)).toBe(2);
    expect(marqueeCopies(1920, Number.POSITIVE_INFINITY)).toBe(2);
  });
});

describe("parseAnnouncement", () => {
  it("falls back to the defaults when nothing is stored", () => {
    expect(parseAnnouncement(null)).toEqual(DEFAULT_ANNOUNCEMENT);
    expect(parseAnnouncement("")).toEqual(DEFAULT_ANNOUNCEMENT);
  });

  it("falls back to the defaults rather than breaking on malformed JSON", () => {
    expect(parseAnnouncement("{not json")).toEqual(DEFAULT_ANNOUNCEMENT);
  });

  it("treats an explicitly emptied list as off, not as a reset to defaults", () => {
    expect(parseAnnouncement(JSON.stringify({ enabled: true, messages: [] }))).toEqual({
      enabled: false,
      messages: [],
    });
  });

  it("trims and drops blank lines", () => {
    expect(parseAnnouncement(JSON.stringify({ enabled: true, messages: ["  a  ", "", "   ", "b"] }))).toEqual({
      enabled: true,
      messages: ["a", "b"],
    });
  });

  it("respects an explicit disable", () => {
    expect(parseAnnouncement(JSON.stringify({ enabled: false, messages: ["a"] }))).toEqual({
      enabled: false,
      messages: ["a"],
    });
  });
});
