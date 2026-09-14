"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { db } from "@/db/client";
import { promoCodes } from "@/db/schema";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import { toCentavos } from "@/domain/money";

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
  };
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createPromoCode(formData: FormData) {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("promo-code-create", admin.id),
    limit: 30,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");

  const parsed = createSchema.parse(readCodeFields(formData));
  if (parsed.type === "PERCENTAGE" && parsed.amount > 100) {
    throw new Error("Percentage discounts can't exceed 100%");
  }
  const amount = parsed.type === "FIXED" ? toCentavos(parsed.amount) : Math.round(parsed.amount);
  const minSpendCentavos = parsed.minSpendCentavos !== undefined ? toCentavos(parsed.minSpendCentavos) : undefined;

  const existing = (await db().select({ id: promoCodes.id }).from(promoCodes).where(eq(promoCodes.code, parsed.code)))[0];
  if (existing) throw new Error(`Code "${parsed.code}" already exists`);

  const created = await db()
    .insert(promoCodes)
    .values({
      code: parsed.code,
      type: parsed.type,
      amount,
      scope: parsed.scope,
      minSpendCentavos: minSpendCentavos ?? null,
      firstOrderOnly: parsed.firstOrderOnly,
      onePerCustomer: parsed.onePerCustomer,
      maxRedemptions: parsed.maxRedemptions ?? null,
      startsAt: parseDate(parsed.startsAt),
      endsAt: parseDate(parsed.endsAt),
      isActive: true,
    })
    .returning({ id: promoCodes.id });

  await auditLogSubject({
    actor: admin.id,
    action: "PROMO_CODE_CREATE",
    targetType: "promo_code",
    targetId: created[0].id,
    metadata: { code: parsed.code, type: parsed.type, amount, scope: parsed.scope },
  });
  revalidatePath("/admin/promo");
}

export async function updatePromoCode(formData: FormData) {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("promo-code-update", admin.id),
    limit: 30,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");

  const parsed = updateSchema.parse({ id: formData.get("id"), ...readCodeFields(formData) });
  if (parsed.type === "PERCENTAGE" && parsed.amount > 100) {
    throw new Error("Percentage discounts can't exceed 100%");
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
      })
      .from(promoCodes)
      .where(eq(promoCodes.id, parsed.id))
  )[0];
  if (!current) throw new Error("Promo code not found");

  // Switching PERCENTAGE <-> FIXED re-reads the same number in a different
  // unit — a ₱50 fixed code (prefilled as "50") silently becomes 50% off, and
  // the >100 guard above never sees it. The form posts what it prefilled, so
  // an unchanged amount alongside a changed type is a mistake, not an intent.
  const previousType = formData.get("previousType");
  const previousAmount = formData.get("previousAmount");
  if (typeof previousType === "string" && previousType !== parsed.type && String(parsed.amount) === previousAmount) {
    throw new Error(
      `This code changed from ${previousType} to ${parsed.type} but the amount is still ${previousAmount} — re-enter it in the new unit (a plain percent, or pesos for a fixed ₱ discount).`,
    );
  }

  if (parsed.code !== current.code) {
    // onePerCustomer and the redemption cap are enforced against this row's
    // promo_code_redemption rows, so renaming a redeemed code would quietly
    // carry every past redemption onto the new name (and free the old name to
    // be redeemed again). Same reasoning as the delete guard below.
    if (current.redemptionCount > 0) {
      throw new Error(
        `"${current.code}" has already been redeemed ${current.redemptionCount} time(s) — renaming it would carry those redemptions onto the new code. Create a separate code instead.`,
      );
    }
    const clash = (
      await db().select({ id: promoCodes.id }).from(promoCodes).where(eq(promoCodes.code, parsed.code))
    )[0];
    if (clash) throw new Error(`Code "${parsed.code}" already exists`);
  }
  // A cap under what customers have already redeemed would read as exhausted
  // forever, and those redemptions can't be taken back.
  if (parsed.maxRedemptions !== undefined && parsed.maxRedemptions < current.redemptionCount) {
    throw new Error(
      `This code has already been redeemed ${current.redemptionCount} time(s) — the cap can't be lower than that`,
    );
  }

  const amount = parsed.type === "FIXED" ? toCentavos(parsed.amount) : Math.round(parsed.amount);
  const minSpendCentavos = parsed.minSpendCentavos !== undefined ? toCentavos(parsed.minSpendCentavos) : null;

  // A date input only carries a day, so re-saving an untouched field would
  // flatten any stored time-of-day to UTC midnight — enough to expire an
  // "ends at 23:59" code a day early. Only reparse a date the admin changed.
  const unchanged = (submitted: string | undefined, previous: FormDataEntryValue | null) =>
    (submitted ?? "") === (typeof previous === "string" ? previous : "");
  const startsAt = unchanged(parsed.startsAt, formData.get("previousStartsAt"))
    ? current.startsAt
    : parseDate(parsed.startsAt);
  const endsAt = unchanged(parsed.endsAt, formData.get("previousEndsAt"))
    ? current.endsAt
    : parseDate(parsed.endsAt);
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new Error("This code would end before it starts — check the start and end dates");
  }

  await db()
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
    .where(eq(promoCodes.id, parsed.id));

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
  if (row.redemptionCount > 0) {
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
