"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setOptionActive, upsertOption } from "@/actions/option-list-actions";

interface OptionRow {
  id: string;
  value: string;
  label: string;
  isActive: boolean;
}

export function OptionListEditor({
  listKey,
  description,
  values,
}: {
  listKey: string;
  description: string | null;
  values: OptionRow[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <header className="space-y-1">
        <h2 className="font-serif-display text-base">{listKey.replace(/_/g, " ")}</h2>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </header>
      <ul className="space-y-2">
        {values.map((row) => (
          <li key={row.id} className="grid grid-cols-1 items-end gap-2 border-t pt-2 sm:grid-cols-4">
            <form
              action={(formData) =>
                startTransition(async () => {
                  try {
                    await upsertOption({
                      listKey,
                      id: row.id,
                      value: String(formData.get("value") ?? ""),
                      label: String(formData.get("label") ?? ""),
                    });
                    toast.success("Saved");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Save failed");
                  }
                })
              }
              className="contents"
            >
              <div className="space-y-1">
                <Label htmlFor={`${row.id}-value`}>Value</Label>
                <Input id={`${row.id}-value`} name="value" defaultValue={row.value} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${row.id}-label`}>Label</Label>
                <Input id={`${row.id}-label`} name="label" defaultValue={row.label} required />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                Save
              </Button>
            </form>
            <Button
              type="button"
              variant={row.isActive ? "destructive" : "outline"}
              className="w-full"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await setOptionActive(row.id, !row.isActive);
                    toast.success(row.isActive ? "Deactivated" : "Activated");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed");
                  }
                })
              }
            >
              {row.isActive ? "Deactivate" : "Activate"}
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="grid grid-cols-1 items-end gap-2 border-t pt-3 sm:grid-cols-4"
        action={(formData) =>
          startTransition(async () => {
            try {
              await upsertOption({
                listKey,
                id: null,
                value: String(formData.get("value") ?? ""),
                label: String(formData.get("label") ?? ""),
              });
              toast.success("Added");
              (formData as unknown as HTMLFormElement).reset?.();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Add failed");
            }
          })
        }
      >
        <div className="space-y-1">
          <Label htmlFor={`${listKey}-new-value`}>New value</Label>
          <Input id={`${listKey}-new-value`} name="value" required placeholder="e.g. SPICY" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${listKey}-new-label`}>Label</Label>
          <Input id={`${listKey}-new-label`} name="label" required placeholder="Spicy" />
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          Add
        </Button>
      </form>
    </section>
  );
}
