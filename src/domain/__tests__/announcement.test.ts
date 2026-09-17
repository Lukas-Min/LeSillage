import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANNOUNCEMENT,
  estimateMarqueeCopyWidth,
  marqueeCopies,
  parseAnnouncement,
  SSR_MARQUEE_BAR_WIDTH,
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

describe("estimateMarqueeCopyWidth", () => {
  // The three live messages measured 1,066px at 12px in Chrome; the estimate
  // must land under that so the server render errs towards extra copies.
  const live = [
    "Enjoy 10% off your first order with code WELCOME10 · no minimum spend",
    "Free delivery on ₱2,000 of decants",
    "Free complimentary tester for decant orders over ₱2,000",
  ];

  it("under-estimates the measured width rather than over-shooting it", () => {
    const estimate = estimateMarqueeCopyWidth(live, 12);
    expect(estimate).toBeLessThan(1066);
    expect(estimate).toBeGreaterThan(800);
  });

  it("scales with the font size and is empty for no messages", () => {
    expect(estimateMarqueeCopyWidth(live, 13)).toBeGreaterThan(estimateMarqueeCopyWidth(live, 12));
    expect(estimateMarqueeCopyWidth([], 13)).toBe(0);
  });

  it("seeds enough copies for a wide monitor before hydration", () => {
    // The regression from the screenshot: 1,900px wide, two copies, blank tail.
    const copies = marqueeCopies(SSR_MARQUEE_BAR_WIDTH, estimateMarqueeCopyWidth(live, 13));
    expect((copies - 1) * 1066).toBeGreaterThanOrEqual(1900);
    expect((copies - 1) * 1066).toBeGreaterThanOrEqual(SSR_MARQUEE_BAR_WIDTH);
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
