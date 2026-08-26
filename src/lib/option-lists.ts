import "server-only";
import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { optionLists, optionValues } from "@/db/schema";

export interface ActiveOption {
  value: string;
  label: string;
}

export interface OptionSet {
  key: string;
  description: string | null;
  values: ActiveOption[];
}

export const getOptionSet = cache(async (key: string): Promise<ActiveOption[]> => {
  const rows = await db()
    .select({ value: optionValues.value, label: optionValues.label })
    .from(optionValues)
    .innerJoin(optionLists, eq(optionLists.key, optionValues.listKey))
    .where(and(eq(optionValues.listKey, key), eq(optionValues.isActive, true)))
    .orderBy(asc(optionValues.position));
  return rows;
});

export const getOptionList = cache(async (key: string): Promise<OptionSet | null> => {
  const list = (await db().select().from(optionLists).where(eq(optionLists.key, key)))[0];
  if (!list) return null;
  const values = await getOptionSet(key);
  return { key: list.key, description: list.description, values };
});

export async function listOptionKeys(): Promise<string[]> {
  const rows = await db().select({ key: optionLists.key }).from(optionLists);
  return rows.map((r) => r.key);
}
