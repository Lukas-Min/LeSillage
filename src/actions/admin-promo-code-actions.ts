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

  const parsed = createSchema.parse({
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
  });
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
  revalidatePath("/admin/promo-codes");
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
  revalidatePath("/admin/promo-codes");
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
  revalidatePath("/admin/promo-codes");
}
