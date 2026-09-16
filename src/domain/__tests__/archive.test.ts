import { describe, expect, it } from "vitest";
import { ARCHIVE_DELETE_AFTER_MS, isDueForArchiveDelete } from "../archive";

const thirtyDaysAgo = new Date("2026-08-05T12:00:00.000Z");
const now = new Date(thirtyDaysAgo.getTime() + ARCHIVE_DELETE_AFTER_MS);

describe("isDueForArchiveDelete", () => {
  it("is due after 30 days archived", () => {
    expect(isDueForArchiveDelete({ archivedAt: thirtyDaysAgo, now })).toBe(true);
  });

  it("is not due before 30 days", () => {
    expect(
      isDueForArchiveDelete({ archivedAt: thirtyDaysAgo, now: new Date(thirtyDaysAgo.getTime() + ARCHIVE_DELETE_AFTER_MS - 1) }),
    ).toBe(false);
  });

  it("is not due when not archived", () => {
    expect(isDueForArchiveDelete({ archivedAt: null, now })).toBe(false);
  });
});
