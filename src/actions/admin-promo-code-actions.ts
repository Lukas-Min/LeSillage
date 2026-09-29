"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { db } from "@/db/client";
import {
  orders,
  promoCodeAllowedUsers,
  promoCodeRedemptions,
  promoCodes,
  users,
  type PromoCode,
} from "@/db/schema";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import { formatPHP, toCentavos } from "@/domain/money";
import { parsePhDateBoundary } from "@/domain/ph-date";
import { unsubscribePageUrl } from "@/lib/email-links";
import { promoAssignedEmail } from "@/lib/email-templates";
import { drainMarketingQueue, enqueueMarketingEmails } from "@/lib/marketing-queue";
import { withAllowedUsers } from "@/lib/promo-code-access";

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
  description: z.string().trim().max(500).optional(),
  // Customers who may use the code; empty means every customer.
  allowedUserIds: z.array(z.string().min(1)).max(500),
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
    description: formData.has("description") ? String(formData.get("description")) : undefined,
    // restrictedUserId is what the one-customer form posted before the list
    // existed; a tab opened before a deploy can still send it.
    allowedUserIds: [
      ...new Set(
        [...formData.getAll("allowedUserIds"), formData.get("restrictedUserId") ?? ""].map(String).filter(Boolean),
      ),
    ],
    sendEmail: formData.get("sendEmail") === "on",
  };
}

/**
 * Customers who can actually still use this code, independent of any one
 * order's contents — everyone who opted into marketing email, minus whoever
 * the code's own rules (onePerCustomer/firstOrderOnly) have already used up.
 * Mirrors the same "counts as an order" definition checkPromoCodeEligibility's
 * callers use (src/actions/promo-code-actions.ts, src/lib/orders.ts): every
 * order except REJECTED/CANCELLED. Not used for a code limited to chosen
 * customers — those customers are emailed directly (emailAllowedCustomers).
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

/** Queues a promo email for every still-eligible subscriber after the
 *  response, and sends the first batch; the hourly cron sends the rest. */
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
  description: string | null;
  minSpendCentavos: number | null;
}) {
  // Nobody can redeem an exhausted code, so there's nothing to announce.
  if (code.maxRedemptions !== null && code.redemptionCount >= code.maxRedemptions) return;
  const offer = describeCustomerOffer(code.type, code.amount, code.scope, code.maxRedemptions);
  after(async () => {
    const recipients = await loadEligibleSubscribers(code);
    await enqueueMarketingEmails(
      recipients.map((recipient) => ({
        recipient: recipient.email,
        template: "promo_code_broadcast",
        ...promoAssignedEmail({
          name: recipient.name,
          code: code.code,
          offer,
          description: code.description,
          minSpendCentavos: code.minSpendCentavos,
          unsubscribeUrl: unsubscribePageUrl(recipient.email),
        }),
      })),
    );
    await drainMarketingQueue();
  });
}

interface AllowedCustomer {
  id: string;
  email: string | null;
  name: string | null;
  deletedAt: Date | null;
  archivedAt: Date | null;
  marketingOptIn: boolean;
}

/**
 * The chosen customers, or an error if one can't be added. A customer whose
 * account was deleted after being listed stays on the list (they can't sign
 * in, so it's inert) — dropping them could empty the list, which would open
 * the code to everyone. Only newly added customers must have a live account.
 */
async function loadAllowedCustomers(
  ids: readonly string[],
  alreadyAllowed: readonly string[] = [],
): Promise<AllowedCustomer[] | string> {
  if (ids.length === 0) return [];
  const found = await db()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      deletedAt: users.deletedAt,
      archivedAt: users.archivedAt,
      marketingOptIn: users.marketingOptIn,
    })
    .from(users)
    .where(inArray(users.id, [...ids]));
  const unusable = ids.some((id) => {
    const customer = found.find((row) => row.id === id);
    return !customer || (customer.deletedAt !== null && !alreadyAllowed.includes(id));
  });
  if (unusable) return "One of the chosen customers no longer has an account — remove them and save again";
  return found;
}

/** Kept in the old single-customer column too, so an older build (a rollback,
 *  or a tab from before the deploy) limits the code instead of opening it. */
function legacyRestrictedUserId(customers: readonly AllowedCustomer[]): string | null {
  return (customers.find((customer) => customer.deletedAt === null) ?? customers[0])?.id ?? null;
}

/** Queues each chosen customer's code email (first batch sent right away).
 *  Skips anyone who turned promotions off or whose account is archived or deleted. */
function emailAllowedCustomers(
  customers: readonly AllowedCustomer[],
  details: { code: string; offer: string; description: string | null; minSpendCentavos: number | null },
) {
  const recipients = customers.filter(
    (customer): customer is AllowedCustomer & { email: string } =>
      Boolean(customer.email) && customer.marketingOptIn && !customer.deletedAt && !customer.archivedAt,
  );
  if (recipients.length === 0) return;
  after(async () => {
    await enqueueMarketingEmails(
      recipients.map((recipient) => ({
        recipient: recipient.email,
        template: "promo_code_assigned",
        ...promoAssignedEmail({
          name: recipient.name,
          ...details,
          unsubscribeUrl: unsubscribePageUrl(recipient.email),
        }),
      })),
    );
    await drainMarketingQueue();
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

  const allowed = await loadAllowedCustomers(parsed.allowedUserIds);
  if (typeof allowed === "string") return failed(allowed);

  const createdId = await db().transaction(async (tx) => {
    const created = await tx
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
        description: parsed.description || null,
        restrictedUserId: legacyRestrictedUserId(allowed),
      })
      .returning({ id: promoCodes.id });
    const id = created[0].id;
    if (allowed.length > 0) {
      await tx
        .insert(promoCodeAllowedUsers)
        .values(allowed.map((customer) => ({ promoCodeId: id, userId: customer.id })));
    }
    return id;
  });

  await auditLogSubject({
    actor: admin.id,
    action: "PROMO_CODE_CREATE",
    targetType: "promo_code",
    targetId: createdId,
    metadata: {
      code: parsed.code,
      type: parsed.type,
      amount,
      scope: parsed.scope,
      allowedUserIds: allowed.map((customer) => customer.id),
    },
  });
  revalidatePath("/admin/promo");
  for (const customer of allowed) revalidatePath(`/admin/customers/${customer.id}`);
  if (parsed.sendEmail) {
    if (allowed.length > 0) {
      const offer = describeCustomerOffer(parsed.type, amount, parsed.scope, parsed.maxRedemptions ?? null);
      emailAllowedCustomers(allowed, {
        code: parsed.code,
        offer,
        description: parsed.description || null,
        minSpendCentavos,
      });
    } else {
      broadcastPromoEmail({
        id: createdId,
        code: parsed.code,
        type: parsed.type,
        amount,
        scope: parsed.scope,
        maxRedemptions: parsed.maxRedemptions ?? null,
        redemptionCount: 0,
        firstOrderOnly: parsed.firstOrderOnly,
        onePerCustomer: parsed.onePerCustomer,
        description: parsed.description || null,
        minSpendCentavos,
      });
    }
  }
  // "Add promo code" on a customer's page sends them back there.
  const returnTo = formData.get("returnToCustomer");
  if (typeof returnTo === "string" && allowed.some((customer) => customer.id === returnTo)) {
    redirect(`/admin/customers/${returnTo}`);
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
        description: promoCodes.description,
        id: promoCodes.id,
        restrictedUserId: promoCodes.restrictedUserId,
      })
      .from(promoCodes)
      .where(eq(promoCodes.id, parsed.id))
  )[0];
  if (!current) return failed("Promo code not found");
  const [{ allowedUserIds: previousAllowedUserIds }] = await withAllowedUsers([current]);
  // Only the current form posts this marker. A post without it (a tab from
  // before the list existed) leaves who can use the code untouched, rather
  // than reading the missing field as "list cleared" and opening the code.
  const replaceList = formData.get("allowedUsersField") === "1";
  const allowed = await loadAllowedCustomers(
    replaceList ? parsed.allowedUserIds : previousAllowedUserIds,
    previousAllowedUserIds,
  );
  if (typeof allowed === "string") return failed(allowed);
  // A form from before descriptions existed doesn't post the field; keep what's there.
  const description = parsed.description !== undefined ? parsed.description || null : current.description;

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

  const written = await db().transaction(async (tx) => {
    const rows = await tx
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
        description,
        ...(replaceList ? { restrictedUserId: legacyRestrictedUserId(allowed) } : {}),
        // isActive and redemptionCount are deliberately left alone: activation is
        // the Activate/Deactivate button's job, and the count is ledger data that
        // must keep matching the promo_code_redemption rows.
      })
      .where(eq(promoCodes.id, parsed.id))
      .returning({ id: promoCodes.id });
    if (rows.length === 0 || !replaceList) return rows;
    await tx.delete(promoCodeAllowedUsers).where(eq(promoCodeAllowedUsers.promoCodeId, parsed.id));
    if (allowed.length > 0) {
      await tx
        .insert(promoCodeAllowedUsers)
        .values(allowed.map((customer) => ({ promoCodeId: parsed.id, userId: customer.id })));
    }
    return rows;
  });
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
      allowedUserIds: allowed.map((customer) => customer.id),
      previousAllowedUserIds,
    },
  });
  revalidatePath("/admin/promo");
  for (const userId of new Set([...previousAllowedUserIds, ...allowed.map((customer) => customer.id)])) {
    revalidatePath(`/admin/customers/${userId}`);
  }
  // A deactivated code has no eligible recipients regardless of the checkbox
  // — nobody can use it, so there's nothing worth emailing about.
  if (parsed.sendEmail && current.isActive) {
    if (allowed.length > 0) {
      const offer = describeCustomerOffer(parsed.type, amount, parsed.scope, parsed.maxRedemptions ?? null);
      emailAllowedCustomers(allowed, { code: parsed.code, offer, description, minSpendCentavos });
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
        description,
        minSpendCentavos,
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
