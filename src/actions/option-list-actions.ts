"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  optionLists,
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

/** Reported to the form instead of thrown: a thrown Server Action error's
 *  message is replaced by a digest in production. */
export type OptionListResult = { ok: true } | { ok: false; error: string };

export interface OptionListSaveInput {
  listKey: string;
  /** Every existing row as the admin left it; only changed ones are written. */
  rows: { id: string; value: string; label: string; isActive: boolean }[];
}

async function limitOptions(adminId: string): Promise<boolean> {
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("options", adminId),
    limit: 60,
    windowMs: 60_000,
  });
  return decision.allowed;
}

/**
 * The one Save for a whole list on /admin/settings: writes every changed
 * value, label and Active box together, or nothing. A value that products or
 * SKUs still store can't be renamed or turned off — they'd point at nothing —
 * so only its label can change.
 */
export async function saveOptionList(input: OptionListSaveInput): Promise<OptionListResult> {
  const admin = await requireAdmin();
  if (!(await limitOptions(admin.id))) return { ok: false, error: "Too many requests. Please slow down." };

  const existing = await db()
    .select()
    .from(optionValues)
    .where(eq(optionValues.listKey, input.listKey))
    .orderBy(asc(optionValues.position));
  const byId = new Map(existing.map((row) => [row.id, row]));
  const rows = input.rows.map((row) => ({ ...row, value: row.value.trim(), label: row.label.trim() }));
  if (rows.some((row) => !byId.has(row.id))) {
    return { ok: false, error: "This list changed since you opened it. Reload the page and try again." };
  }
  if (rows.some((row) => !row.value || !row.label)) {
    return { ok: false, error: "Every entry needs both a value and a label." };
  }
  const finalValues = existing.map((row) => rows.find((r) => r.id === row.id)?.value ?? row.value);
  const seen = new Set<string>();
  for (const value of finalValues) {
    const folded = value.toLowerCase();
    if (seen.has(folded)) return { ok: false, error: `Two entries use the value "${value}".` };
    seen.add(folded);
  }

  const changed = rows.filter((row) => {
    const before = byId.get(row.id)!;
    return before.value !== row.value || before.label !== row.label || before.isActive !== row.isActive;
  });
  if (changed.length === 0) return { ok: true };
  for (const row of changed) {
    const before = byId.get(row.id)!;
    const renaming = before.value !== row.value;
    const turningOff = before.isActive && !row.isActive;
    if ((renaming || turningOff) && (await isOptionInUse(input.listKey, before.value))) {
      return {
        ok: false,
        error: renaming
          ? `"${before.label}" is used by products, so its value can't change. Edit the label instead.`
          : `"${before.label}" is used by products, so it can't be turned off.`,
      };
    }
  }

  try {
    await db().transaction(async (tx) => {
      for (const row of changed) {
        await tx
          .update(optionValues)
          .set({ value: row.value, label: row.label, isActive: row.isActive })
          .where(eq(optionValues.id, row.id));
      }
    });
  } catch (error) {
    // Most likely two entries swapping values, which the unique index sees
    // halfway through.
    console.error("saveOptionList failed", error);
    return { ok: false, error: "Couldn't save these changes together. Try changing one value at a time." };
  }
  await auditLogSubject({
    actor: admin.id,
    action: "OPTION_VALUE_CHANGE",
    targetType: "option_list",
    targetId: input.listKey,
    metadata: {
      changed: changed.map((row) => ({ id: row.id, value: row.value, label: row.label, isActive: row.isActive })),
    },
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** The form on /admin/settings/new — adds one entry to a list, then goes back. */
export async function createOptionValue(_prev: OptionListResult | null, formData: FormData): Promise<OptionListResult> {
  const admin = await requireAdmin();
  if (!(await limitOptions(admin.id))) return { ok: false, error: "Too many requests. Please slow down." };
  const listKey = String(formData.get("listKey") ?? "");
  const value = String(formData.get("value") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  if (!value || !label) return { ok: false, error: "Enter both a value and a label." };

  const list = (await db().select({ key: optionLists.key }).from(optionLists).where(eq(optionLists.key, listKey)))[0];
  if (!list) return { ok: false, error: "That list no longer exists." };
  const items = await db()
    .select({ value: optionValues.value, position: optionValues.position })
    .from(optionValues)
    .where(eq(optionValues.listKey, listKey))
    .orderBy(asc(optionValues.position));
  if (items.length >= MAX_PER_LIST) return { ok: false, error: `This list is full (${MAX_PER_LIST} entries).` };
  if (items.some((item) => item.value.toLowerCase() === value.toLowerCase())) {
    return { ok: false, error: `"${value}" is already in this list.` };
  }
  try {
    await db().insert(optionValues).values({
      listKey,
      value,
      label,
      position: (items[items.length - 1]?.position ?? -1) + 1,
      isActive: true,
    });
  } catch (error) {
    console.error("createOptionValue failed", error);
    return { ok: false, error: "Couldn't add it. Reload and try again." };
  }
  await auditLogSubject({
    actor: admin.id,
    action: "OPTION_VALUE_CHANGE",
    targetType: "option_list",
    targetId: listKey,
    metadata: { added: { value, label } },
  });
  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}
