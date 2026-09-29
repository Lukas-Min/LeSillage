"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { db } from "@/db/client";
import { notificationLog, orders, promoCodeRedemptions, promoCodes, users, type PromoCode } from "@/db/schema";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import { formatPHP, toCentavos } from "@/domain/money";
import { parsePhDateBoundary } from "@/domain/ph-date";
import { sendEmail } from "@/lib/email";
import { promoAssignedEmail } from "@/lib/email-templates";

const createSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .transform((value) => value.toUpperCase()),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  // Pesos when type is FIXED (converted to centavos below); a plain percent when PERCENTAGE.
  amount: z.coerce.number().min(1),
  scope: z.enum(["ORDER", "DELIVERY"]),
  // Entered in pesos, converted to centavos below.
  minSpendCentavos: z.coerce.number().min(0).optional(),
  firstOrderOnly: z.coerce.boolean(),
  onePerCustomer: z.coerce.boolean(),
  maxRedemptions: z.coerce.number().int().min(1).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  restrictedUserId: z.string().min(1).optional(),
  sendEmail: z.coerce.boolean(),
});

// Editing reuses every create field; only the target row id is extra.
const updateSchema = createSchema.extend({ id: z.string().min(1) });

/** Reads the shared code fields off a submitted form. */
function readCodeFields(formData: FormData) {
  return {
    code: formData.get("code"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    scope: formData.get("scope"),
    minSpendCentavos: formData.get("minSpendCentavos") || undefined,
    firstOrderOnly: formData.get("firstOrderOnly") === "on",
    onePerCustomer: formData.get("onePerCustomer") === "on",
    maxRedemptions: formData.get("maxRedemptions") || undefined,
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
    restrictedUserId: formData.get("restrictedUserId") || undefined,
    sendEmail: formData.get("sendEmail") === "on",
  };
}

/**
 * Customers who can actually still use this code, independent of any one
 * order's contents — everyone who opted into marketing email, minus whoever
 * the code's own rules (onePerCustomer/firstOrderOnly) have already used up.
 * Mirrors the same "counts as an order" definition checkPromoCodeEligibility's
 * callers use (src/actions/promo-code-actions.ts, src/lib/orders.ts): every
 * order except REJECTED/CANCELLED. Not used for a restricted code — that one
 * has exactly one intended recipient, looked up directly by id instead.
 */
async function loadEligibleSubscribers(
  code: Pick<PromoCode, "id" | "firstOrderOnly" | "onePerCustomer">,
): Promise<Array<{ email: string; name: string | null }>> {
  const client = db();
  const candidates = await client
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(and(eq(users.marketingOptIn, true), isNull(users.deletedAt), isNull(users.archivedAt)));

  let eligible = candidates;
  if (code.onePerCustomer) {
    const redeemed = await client
      .select({ userId: promoCodeRedemptions.userId })
      .from(promoCodeRedemptions)
      .where(eq(promoCodeRedemptions.promoCodeId, code.id));
    const redeemedIds = new Set(redeemed.map((r) => r.userId));
    eligible = eligible.filter((u) => !redeemedIds.has(u.id));
  }
  if (code.firstOrderOnly) {
    const ordered = await client
      .select({ userId: orders.userId })
      .from(orders)
      .where(notInArray(orders.status, ["REJECTED", "CANCELLED"]));
    const orderedIds = new Set(ordered.map((r) => r.userId));
    eligible = eligible.filter((u) => !orderedIds.has(u.id));
  }
  return eligible.filter((u): u is { id: string; email: string; name: string | null } => u.email !== null);
}

/** Fire-and-forget a promo email to every still-eligible subscriber, logging
 *  each attempt individually — same audit trail shape as the single-customer
 *  send below, just one row per recipient instead of one row total. */
function broadcastPromoEmail(code: {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  amount: number;
  scope: "ORDER" | "DELIVERY";
  maxRedemptions: number | null;
  redemptionCount: number;
  firstOrderOnly: boolean;
  onePerCustomer: boolean;
}) {
  // Nobody can redeem an exhausted code, so there's nothing to announce.
  if (code.maxRedemptions !== null && code.redemptionCount >= code.maxRedemptions) return;
  const offer = describeCustomerOffer(code.type, code.amount, code.scope, code.maxRedemptions);
  after(async () => {
    const recipients = await loadEligibleSubscribers(code);
    for (const recipient of recipients) {
      const message = promoAssignedEmail({ name: recipient.name, code: code.code, offer });
      const result = await sendEmail({ to: recipient.email, subject: message.subject, text: message.text, html: message.html });
      await db().insert(notificationLog).values({
        recipient: recipient.email,
        template: "promo_code_broadcast",
        status: result.ok ? "SENT" : "FAILED",
        error: result.ok ? null : result.error ?? "unknown",
      });
    }
  });
}

/**
 * Both promo-code forms report expected rejections this way instead of
 * throwing. A thrown Server Action error has its message replaced by a React
 * #441 digest in production, and the resulting error boundary would unmount
 * the form and discard everything the admin had typed — see the same
 * treatment on the customer side in src/actions/promo-code-actions.ts.
 */
export interface PromoCodeFormState {
  /** Stamped on every successful save, so a repeat success still re-triggers. */
  savedAt: number;
  error: string | null;
}

function failed(error: string): PromoCodeFormState {
  return { savedAt: 0, error };
}

function saved(): PromoCodeFormState {
  return { savedAt: Date.now(), error: null };
}

/** Zod messages are terse but precise, and this form's only audience is an admin. */
function describeIssues(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Something in this form isn't valid.";
  const field = issue.path.join(".");
  return field ? `Check "${field}": ${issue.message}` : issue.message;
}

// See src/domain/ph-date.ts for why a bare <input type="date"> value needs
// explicit +08:00 (Philippine Time) anchoring; parsePhDateBoundary is that
// shared helper, also used by product discounts and by the reverse
// conversion (formatPhDateBoundary) in src/app/admin/promo/page.tsx.
const parseDate = parsePhDateBoundary;

export async function createPromoCode(
  _prev: PromoCodeFormState,
  formData: FormData,
): Promise<PromoCodeFormState> {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("promo-code-create", admin.id),
    limit: 30,
    windowMs: 60_000,
  });
  if (!decision.allowed) return failed("Too many requests. Please slow down.");

  const result = createSchema.safeParse(readCodeFields(formData));
  if (!result.success) return failed(describeIssues(result.error));
  const parsed = result.data;
  if (parsed.type === "PERCENTAGE" && parsed.amount > 100) {
    return failed("Percentage discounts can't exceed 100%");
  }
  const amount = parsed.type === "FIXED" ? toCentavos(parsed.amount) : Math.round(parsed.amount);
  // A ₱0 minimum is the same thing as no minimum, and the codes list already
  // renders 0 as "no minimum" — store it that way so the two agree.
  const minSpendCentavos = parsed.minSpendCentavos ? toCentavos(parsed.minSpendCentavos) : null;
  const startsAt = parseDate(parsed.startsAt, "start");
  const endsAt = parseDate(parsed.endsAt, "end");
  if (startsAt && endsAt && endsAt < startsAt) {
    return failed("This code would end before it starts — check the start and end dates");
  }

  const existing = (await db().select({ id: promoCodes.id }).from(promoCodes).where(eq(promoCodes.code, parsed.code)))[0];
  if (existing) return failed(`Code "${parsed.code}" already exists`);

  let restrictedUserId: string | null = null;
  let customerEmail: string | null = null;
  let customerName: string | null = null;
  if (parsed.restrictedUserId) {
    const customer = (
      await db()
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, parsed.restrictedUserId))
    )[0];
    if (!customer?.email) return failed("That customer no longer exists");
    restrictedUserId = customer.id;
    customerEmail = customer.email;
    customerName = customer.name;
  }

  const created = await db()
    .insert(promoCodes)
    .values({
      code: parsed.code,
      type: parsed.type,
      amount,
      scope: parsed.scope,
      minSpendCentavos,
      firstOrderOnly: parsed.firstOrderOnly,
      onePerCustomer: parsed.onePerCustomer,
      maxRedemptions: parsed.maxRedemptions ?? null,
      startsAt,
      endsAt,
      isActive: true,
      restrictedUserId,
    })
    .returning({ id: promoCodes.id });

  await auditLogSubject({
    actor: admin.id,
    action: "PROMO_CODE_CREATE",
    targetType: "promo_code",
    targetId: created[0].id,
    metadata: { code: parsed.code, type: parsed.type, amount, scope: parsed.scope, restrictedUserId },
  });
  revalidatePath("/admin/promo");
  if (restrictedUserId && customerEmail) {
    revalidatePath(`/admin/customers/${restrictedUserId}`);
    if (parsed.sendEmail) {
      const offer = describeCustomerOffer(parsed.type, amount, parsed.scope, parsed.maxRedemptions ?? null);
      const email = customerEmail;
      const name = customerName;
      const code = parsed.code;
      after(async () => {
        const message = promoAssignedEmail({ name, code, offer });
        const result = await sendEmail({ to: email, subject: message.subject, text: message.text, html: message.html });
        await db().insert(notificationLog).values({
          recipient: email,
          template: "promo_code_assigned",
          status: result.ok ? "SENT" : "FAILED",
          error: result.ok ? null : result.error ?? "unknown",
        });
      });
    }
    redirect(`/admin/customers/${restrictedUserId}`);
  }
  if (parsed.sendEmail) {
    broadcastPromoEmail({
      id: created[0].id,
      code: parsed.code,
      type: parsed.type,
      amount,
      scope: parsed.scope,
      maxRedemptions: parsed.maxRedemptions ?? null,
      redemptionCount: 0,
      firstOrderOnly: parsed.firstOrderOnly,
      onePerCustomer: parsed.onePerCustomer,
    });
  }
  redirect("/admin/promo?tab=codes");
}

function describeCustomerOffer(
  type: "PERCENTAGE" | "FIXED",
  amount: number,
  scope: "ORDER" | "DELIVERY",
  maxRedemptions: number | null,
): string {
  const off = type === "PERCENTAGE" ? `${amount}%` : formatPHP(amount);
  const target = scope === "ORDER" ? "your order" : "delivery";
  const times =
    maxRedemptions === 1
      ? " You can use it once."
      : maxRedemptions
        ? ` You can use it ${maxRedemptions} times.`
        : "";
  return `${off} off ${target}.${times}`;
}

export async function updatePromoCode(
  _prev: PromoCodeFormState,
  formData: FormData,
): Promise<PromoCodeFormState> {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("promo-code-update", admin.id),
    limit: 30,
    windowMs: 60_000,
  });
  if (!decision.allowed) return failed("Too many requests. Please slow down.");

  const result = updateSchema.safeParse({ id: formData.get("id"), ...readCodeFields(formData) });
  if (!result.success) return failed(describeIssues(result.error));
  const parsed = result.data;
  if (parsed.type === "PERCENTAGE" && parsed.amount > 100) {
    return failed("Percentage discounts can't exceed 100%");
  }

  const current = (
    await db()
      .select({
        code: promoCodes.code,
        type: promoCodes.type,
        amount: promoCodes.amount,
        scope: promoCodes.scope,
        startsAt: promoCodes.startsAt,
        endsAt: promoCodes.endsAt,
        redemptionCount: promoCodes.redemptionCount,
        isActive: promoCodes.isActive,
        restrictedUserId: promoCodes.restrictedUserId,
      })
      .from(promoCodes)
      .where(eq(promoCodes.id, parsed.id))
  )[0];
  if (!current) return failed("Promo code not found");

  // Switching PERCENTAGE <-> FIXED re-reads the same number in a different
  // unit — a ₱50 fixed code (prefilled as "50") silently becomes 50% off, and
  // the >100 guard above never sees it. The form clears the amount on a type
  // switch; this is the server-side half of that, for a stale or hand-built post.
  const previousType = formData.get("previousType");
  const previousAmount = formData.get("previousAmount");
  if (typeof previousType === "string" && previousType !== parsed.type && String(parsed.amount) === previousAmount) {
    return failed(
      `This code changed from ${previousType} to ${parsed.type} but the amount is still ${previousAmount} — re-enter it in the new unit (a plain percent, or pesos for a fixed ₱ discount).`,
    );
  }

  if (parsed.code !== current.code) {
    // onePerCustomer and the redemption cap are enforced against this row's
    // promo_code_redemption rows, so renaming a redeemed code would quietly
    // carry every past redemption onto the new name (and free the old name to
    // be redeemed again). Same reasoning as the delete guard below.
    if (current.redemptionCount > 0) {
      return failed(
        `"${current.code}" has already been redeemed ${current.redemptionCount} time(s) — renaming it would carry those redemptions onto the new code. Create a separate code instead.`,
      );
    }
    const clash = (
      await db().select({ id: promoCodes.id }).from(promoCodes).where(eq(promoCodes.code, parsed.code))
    )[0];
    if (clash) return failed(`Code "${parsed.code}" already exists`);
  }
  // A cap under what customers have already redeemed would read as exhausted
  // forever, and those redemptions can't be taken back.
  if (parsed.maxRedemptions !== undefined && parsed.maxRedemptions < current.redemptionCount) {
    return failed(
      `This code has already been redeemed ${current.redemptionCount} time(s) — the cap can't be lower than that`,
    );
  }

  const amount = parsed.type === "FIXED" ? toCentavos(parsed.amount) : Math.round(parsed.amount);
  const minSpendCentavos = parsed.minSpendCentavos ? toCentavos(parsed.minSpendCentavos) : null;

  // A date input only carries a day, so re-saving an untouched field would
  // flatten any stored time-of-day to UTC midnight — enough to expire an
  // "ends at 23:59" code a day early. Only reparse a date the admin changed.
  const unchanged = (submitted: string | undefined, previous: FormDataEntryValue | null) =>
    (submitted ?? "") === (typeof previous === "string" ? previous : "");
  const startsAt = unchanged(parsed.startsAt, formData.get("previousStartsAt"))
    ? current.startsAt
    : parseDate(parsed.startsAt, "start");
  const endsAt = unchanged(parsed.endsAt, formData.get("previousEndsAt"))
    ? current.endsAt
    : parseDate(parsed.endsAt, "end");
  if (startsAt && endsAt && endsAt < startsAt) {
    return failed("This code would end before it starts — check the start and end dates");
  }

  const written = await db()
    .update(promoCodes)
    .set({
      code: parsed.code,
      type: parsed.type,
      amount,
      scope: parsed.scope,
      minSpendCentavos,
      firstOrderOnly: parsed.firstOrderOnly,
      onePerCustomer: parsed.onePerCustomer,
      maxRedemptions: parsed.maxRedemptions ?? null,
      startsAt,
      endsAt,
      // isActive and redemptionCount are deliberately left alone: activation is
      // the Activate/Deactivate button's job, and the count is ledger data that
      // must keep matching the promo_code_redemption rows.
    })
    .where(eq(promoCodes.id, parsed.id))
    .returning({ id: promoCodes.id });
  // The row can be deleted between the read above and this write.
  if (written.length === 0) return failed("Promo code not found");

  await auditLogSubject({
    actor: admin.id,
    action: "PROMO_CODE_UPDATE",
    targetType: "promo_code",
    targetId: parsed.id,
    // No order snapshots a code's terms (orders store resolved centavos only),
    // so this log is the only record of what a code was worth when its existing
    // redemptions happened — keep the previous values, not just the new ones.
    metadata: {
      code: parsed.code,
      previousCode: current.code,
      type: parsed.type,
      previousType: current.type,
      amount,
      previousAmount: current.amount,
      scope: parsed.scope,
      previousScope: current.scope,
      firstOrderOnly: parsed.firstOrderOnly,
      onePerCustomer: parsed.onePerCustomer,
      redemptionCount: current.redemptionCount,
    },
  });
  revalidatePath("/admin/promo");
  // A deactivated code has no eligible recipients regardless of the checkbox
  // — nobody can use it, so there's nothing worth emailing about.
  if (parsed.sendEmail && current.isActive) {
    if (current.restrictedUserId) {
      const customer = (
        await db()
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, current.restrictedUserId))
      )[0];
      if (customer?.email) {
        const offer = describeCustomerOffer(parsed.type, amount, parsed.scope, parsed.maxRedemptions ?? null);
        const email = customer.email;
        const name = customer.name;
        const code = parsed.code;
        after(async () => {
          const message = promoAssignedEmail({ name, code, offer });
          const result = await sendEmail({ to: email, subject: message.subject, text: message.text, html: message.html });
          await db().insert(notificationLog).values({
            recipient: email,
            template: "promo_code_assigned",
            status: result.ok ? "SENT" : "FAILED",
            error: result.ok ? null : result.error ?? "unknown",
          });
        });
      }
    } else {
      broadcastPromoEmail({
        id: parsed.id,
        code: parsed.code,
        type: parsed.type,
        amount,
        scope: parsed.scope,
        maxRedemptions: parsed.maxRedemptions ?? null,
        redemptionCount: current.redemptionCount,
        firstOrderOnly: parsed.firstOrderOnly,
        onePerCustomer: parsed.onePerCustomer,
      });
    }
  }
  redirect("/admin/promo?tab=codes");
}

export async function togglePromoCodeActive(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";
  const row = (await db().select({ code: promoCodes.code }).from(promoCodes).where(eq(promoCodes.id, id)))[0];
  if (!row) throw new Error("Promo code not found");
  await db().update(promoCodes).set({ isActive }).where(eq(promoCodes.id, id));
  await auditLogSubject({
    actor: admin.id,
    action: "PROMO_CODE_UPDATE",
    targetType: "promo_code",
    targetId: id,
    metadata: { code: row.code, isActive },
  });
  revalidatePath("/admin/promo");
}

export async function deletePromoCode(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const row = (
    await db().select({ code: promoCodes.code, redemptionCount: promoCodes.redemptionCount }).from(promoCodes).where(eq(promoCodes.id, id))
  )[0];
  if (!row) throw new Error("Promo code not found");
  if (row.redemptionCount > 0 && row.code !== "WELCOME10") {
    throw new Error("This code has been redeemed and can't be deleted — deactivate it instead");
  }
  await db().delete(promoCodes).where(eq(promoCodes.id, id));
  await auditLogSubject({
    actor: admin.id,
    action: "PROMO_CODE_DELETE",
    targetType: "promo_code",
    targetId: id,
    metadata: { code: row.code },
  });
  revalidatePath("/admin/promo");
}
