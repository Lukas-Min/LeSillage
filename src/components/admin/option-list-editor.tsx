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
          <li key={row.id} className="flex items-end gap-2 border-t pt-2">
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
              className="flex flex-1 items-end gap-2"
            >
              <div className="flex-1 space-y-1">
                <Label htmlFor={`${row.id}-value`}>Value</Label>
                <Input id={`${row.id}-value`} name="value" defaultValue={row.value} required />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor={`${row.id}-label`}>Label</Label>
                <Input id={`${row.id}-label`} name="label" defaultValue={row.label} required />
              </div>
              <Button type="submit" size="sm" disabled={isPending}>
                Save
              </Button>
            </form>
            <Button
              type="button"
              size="sm"
              variant={row.isActive ? "destructive" : "outline"}
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
        className="flex items-end gap-2 border-t pt-3"
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
        <div className="flex-1 space-y-1">
          <Label htmlFor="new-value">New value</Label>
          <Input id="new-value" name="value" required placeholder="e.g. SPICY" />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="new-label">Label</Label>
          <Input id="new-label" name="label" required placeholder="Spicy" />
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          Add
        </Button>
      </form>
    </section>
  );
}
