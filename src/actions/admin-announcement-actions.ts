"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/auth";
import { db } from "@/db/client";
import { siteContent } from "@/db/schema";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import { ANNOUNCEMENT_KEY, ANNOUNCEMENT_TAG } from "@/lib/announcement";
import { MAX_ANNOUNCEMENT_LENGTH, MAX_ANNOUNCEMENT_MESSAGES } from "@/domain/announcement";

/**
 * Expected rejections come back as state rather than thrown, so a bad save
 * reports why beside the field with the admin's text still in the box — a
 * thrown Server Action error is redacted to a React #441 digest in production.
 */
export interface AnnouncementFormState {
  savedAt: number;
  error: string | null;
}

function failed(error: string): AnnouncementFormState {
  return { savedAt: 0, error };
}

export async function updateAnnouncement(
  _prev: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("announcement-update", admin.id),
    limit: 30,
    windowMs: 60_000,
  });
  if (!decision.allowed) return failed("Too many requests. Please slow down.");

  const enabled = formData.get("enabled") === "on";
  const messages = String(formData.get("messages") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (enabled && messages.length === 0) {
    return failed("Add at least one line, or untick “Show the announcement bar”.");
  }
  if (messages.length > MAX_ANNOUNCEMENT_MESSAGES) {
    return failed(`That's ${messages.length} lines — the bar holds at most ${MAX_ANNOUNCEMENT_MESSAGES}.`);
  }
  const overlong = messages.find((message) => message.length > MAX_ANNOUNCEMENT_LENGTH);
  if (overlong) {
    return failed(
      `Keep each line under ${MAX_ANNOUNCEMENT_LENGTH} characters — “${overlong.slice(0, 40)}…” is ${overlong.length}.`,
    );
  }

  const value = JSON.stringify({ enabled, messages });
  const now = new Date();
  await db()
    .insert(siteContent)
    .values({ key: ANNOUNCEMENT_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: siteContent.key, set: { value, updatedAt: now } });

  await auditLogSubject({
    actor: admin.id,
    action: "ANNOUNCEMENT_UPDATE",
    targetType: "site_content",
    targetId: ANNOUNCEMENT_KEY,
    metadata: { enabled, messageCount: messages.length },
  });

  // The storefront reads this through a cached loader, so the tag has to be
  // updated or the bar keeps showing the old lines. updateTag (not
  // revalidateTag) is the Server Action API in Next 16: it drops the stale
  // entry outright instead of serving it while it refreshes, which is what an
  // admin expects right after pressing Save.
  updateTag(ANNOUNCEMENT_TAG);
  revalidatePath("/admin/promo");
  return { savedAt: Date.now(), error: null };
}
