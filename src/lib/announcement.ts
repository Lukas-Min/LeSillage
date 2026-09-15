import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { siteContent } from "@/db/schema";
import { parseAnnouncement, type AnnouncementConfig } from "@/domain/announcement";

/** Row key in `site_content`, alongside the other editable copy (faq, how-to-pay…). */
export const ANNOUNCEMENT_KEY = "announcement";
/** Cache tag dropped by updateAnnouncement so the bar changes without a deploy. */
export const ANNOUNCEMENT_TAG = "announcement";

/** Uncached read — the admin form needs what is actually stored right now. */
export async function readAnnouncement(): Promise<AnnouncementConfig> {
  const row = (
    await db().select({ value: siteContent.value }).from(siteContent).where(eq(siteContent.key, ANNOUNCEMENT_KEY))
  )[0];
  return parseAnnouncement(row?.value);
}

/**
 * Cached read for the storefront. The root layout renders on every route, so an
 * uncached query here would make all the prerendered pages dynamic; this keeps
 * them static and is dropped by `updateTag(ANNOUNCEMENT_TAG)` the moment an
 * admin saves.
 */
export const loadAnnouncement = unstable_cache(readAnnouncement, ["announcement"], {
  tags: [ANNOUNCEMENT_TAG],
});
