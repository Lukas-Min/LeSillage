import { db } from "@/db/client";
import { optionLists, optionValues } from "@/db/schema";
import { asc } from "drizzle-orm";
import { OptionListEditor, type OptionRow } from "@/components/admin/option-list-editor";
import { loadOptionValuesInUse } from "@/lib/option-usage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader, MiniStat, MiniStats, PageColumns } from "@/components/ui/page-layout";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [lists, inUse] = await Promise.all([
    db().select().from(optionLists).orderBy(asc(optionLists.key)),
    loadOptionValuesInUse(),
  ]);
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
  const group = new Map<string, OptionRow[]>();
  for (const v of values) {
    const arr = group.get(v.listKey) ?? [];
    arr.push({ id: v.id, value: v.value, label: v.label, isActive: v.isActive, inUse: inUse.get(v.listKey)?.has(v.value) ?? false });
    group.set(v.listKey, arr);
  }
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Admin"
        title="Settings"
        subtitle="Edit the dropdown values used across the storefront. Order-status transitions remain code-enforced because they drive inventory and email side effects."
      />
      <PageColumns
        side={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <MiniStats>
                <MiniStat label="Lists" value={lists.length} />
                <MiniStat label="Values" value={values.length} />
              </MiniStats>
            </CardContent>
          </Card>
        }
        main={
          lists.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed border-border/80 p-10 text-center">
              <p className="text-sm text-muted-foreground">No option lists seeded.</p>
            </div>
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
          )
        }
      />
    </div>
  );
}
