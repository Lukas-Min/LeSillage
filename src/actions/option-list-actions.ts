"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  optionValues,
  products,
  skus,
  type Condition,
  type FragranceCategory,
  type Packaging,
  type Provenance,
} from "@/db/schema";
import { requireAdmin } from "@/auth";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";

const MAX_PER_LIST = 64;

export interface OptionEditInput {
  listKey: string;
  id?: string | null;
  value: string;
  label: string;
}

async function isOptionInUse(listKey: string, value: string): Promise<boolean> {
  const client = db();
  if (listKey === "fragrance_category") {
    const r = await client
      .select({ id: products.id })
      .from(products)
      .where(eq(products.fragranceCategory, value as FragranceCategory))
      .limit(1);
    return r.length > 0;
  }
  if (listKey === "fragrance_family") {
    const r = await client
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.family, value)))
      .limit(1);
    return r.length > 0;
  }
  if (listKey === "condition") {
    const r = await client
      .select({ id: skus.id })
      .from(skus)
      .where(eq(skus.condition, value as Condition))
      .limit(1);
    return r.length > 0;
  }
  if (listKey === "provenance") {
    const r = await client
      .select({ id: skus.id })
      .from(skus)
      .where(eq(skus.provenance, value as Provenance))
      .limit(1);
    return r.length > 0;
  }
  if (listKey === "packaging") {
    const r = await client
      .select({ id: skus.id })
      .from(skus)
      .where(eq(skus.packaging, value as Packaging))
      .limit(1);
    return r.length > 0;
  }
  return false;
}

export async function upsertOption(input: OptionEditInput) {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("options", admin.id),
    limit: 60,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");
  const value = input.value.trim();
  const label = input.label.trim();
  if (!value || !label) throw new Error("Value and label are required");
  const existing = input.id
    ? (await db().select().from(optionValues).where(eq(optionValues.id, input.id)))[0]
    : null;
  if (existing) {
    await db()
      .update(optionValues)
      .set({ value, label })
      .where(eq(optionValues.id, existing.id));
  } else {
    const items = await db()
      .select({ position: optionValues.position })
      .from(optionValues)
      .where(eq(optionValues.listKey, input.listKey))
      .orderBy(asc(optionValues.position));
    const highest = items[items.length - 1]?.position ?? -1;
    if (items.length >= MAX_PER_LIST) throw new Error(`List ${input.listKey} is full`);
    await db().insert(optionValues).values({
      listKey: input.listKey,
      value,
      label,
      position: highest + 1,
      isActive: true,
    });
  }
  await auditLogSubject({
    actor: admin.id,
    action: "OPTION_VALUE_CHANGE",
    targetType: "option_list",
    targetId: input.listKey,
    metadata: { value, label },
  });
  revalidatePath("/admin/settings");
}

export async function setOptionActive(id: string, isActive: boolean) {
  const admin = await requireAdmin();
  const row = (await db().select().from(optionValues).where(eq(optionValues.id, id)))[0];
  if (!row) throw new Error("Option not found");
  if (!isActive && (await isOptionInUse(row.listKey, row.value))) {
    throw new Error("Option is in use and cannot be deactivated");
  }
  await db().update(optionValues).set({ isActive }).where(eq(optionValues.id, id));
  await auditLogSubject({
    actor: admin.id,
    action: "OPTION_VALUE_CHANGE",
    targetType: "option_value",
    targetId: id,
    metadata: { isActive },
  });
  revalidatePath("/admin/settings");
}
