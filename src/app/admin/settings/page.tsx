import { db } from "@/db/client";
import { optionLists, optionValues } from "@/db/schema";
import { asc } from "drizzle-orm";
import { OptionListEditor } from "@/components/admin/option-list-editor";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const lists = await db().select().from(optionLists).orderBy(asc(optionLists.key));
  const values = lists.length
    ? await db()
        .select({
          id: optionValues.id,
          listKey: optionValues.listKey,
          value: optionValues.value,
          label: optionValues.label,
          isActive: optionValues.isActive,
          position: optionValues.position,
        })
        .from(optionValues)
        .orderBy(asc(optionValues.listKey), asc(optionValues.position))
    : [];
  const group = new Map<string, typeof values>();
  for (const v of values) {
    const arr = group.get(v.listKey) ?? [];
    arr.push(v);
    group.set(v.listKey, arr);
  }
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Edit the dropdown values used across the storefront. Order-status transitions remain
        code-enforced because they drive inventory and email side effects.
      </p>
      {lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">No option lists seeded.</p>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <OptionListEditor
              key={list.key}
              listKey={list.key}
              description={list.description}
              values={group.get(list.key) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
