"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveOptionList } from "@/actions/option-list-actions";
import { cn } from "@/lib/utils";
import { OPTION_GRID, listTitle } from "@/components/admin/option-list-shared";

export interface OptionRow {
  id: string;
  value: string;
  label: string;
  isActive: boolean;
  /** Stored on products or SKUs: the value and Active box are locked. */
  inUse: boolean;
}

const SAVE_CLASS = "h-11 w-full sm:ml-auto sm:block sm:w-fit";

/**
 * One list on /admin/settings as one form: every entry's value, label and
 * Active box, saved together with a single Save. New entries are added on
 * their own page (/admin/settings/new), like every other create in admin.
 */
export function OptionListEditor({
  listKey,
  description,
  values,
}: {
  listKey: string;
  description: string | null;
  values: OptionRow[];
}) {
  const uid = useId();
  const [rows, setRows] = useState(values);
  // After a save the page re-renders with fresh rows; take them. Adjusting
  // state during render is React's supported way to follow a new prop.
  const [source, setSource] = useState(values);
  if (values !== source) {
    setSource(values);
    setRows(values);
  }
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string; at: number } | null>(null);

  const dirty = rows.some((row, index) => {
    const before = values[index];
    return row.value !== before.value || row.label !== before.label || row.isActive !== before.isActive;
  });

  function edit(id: string, patch: Partial<OptionRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setStatus(null);
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveOptionList({
        listKey,
        rows: rows.map(({ id, value, label, isActive }) => ({ id, value, label, isActive })),
      });
      setStatus(result.ok ? { ok: true, message: "Saved.", at: Date.now() } : { ok: false, message: result.error, at: Date.now() });
    });
  }

  const title = listTitle(listKey);

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <header className="space-y-1">
        <h2 className="font-serif-display text-base">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </header>
      <form onSubmit={save} className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            No entries yet.
          </p>
        ) : (
          <>
            <div className={cn(OPTION_GRID, "text-xs text-muted-foreground")} aria-hidden="true">
              <span>Value</span>
              <span>Label</span>
              <span className="text-center">Active</span>
            </div>
            <ul className="space-y-2">
              {rows.map((row, index) => (
                <li key={row.id} className={OPTION_GRID}>
                  <Input
                    aria-label={`Value ${index + 1}`}
                    value={row.value}
                    readOnly={row.inUse}
                    required
                    onChange={(event) => edit(row.id, { value: event.target.value })}
                    title={row.inUse ? "Used by products, so only the label can change" : undefined}
                    className={cn(row.inUse && "cursor-not-allowed text-muted-foreground")}
                  />
                  <Input
                    aria-label={`Label ${index + 1}`}
                    value={row.label}
                    required
                    onChange={(event) => edit(row.id, { label: event.target.value })}
                  />
                  <label className="flex size-11 items-center justify-center">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={row.isActive}
                      // A used entry can't be turned off; turning one back on is fine.
                      disabled={row.inUse && row.isActive}
                      onChange={(event) => edit(row.id, { isActive: event.target.checked })}
                      aria-label={`${row.label || `Entry ${index + 1}`} active`}
                    />
                  </label>
                </li>
              ))}
            </ul>
            {rows.some((row) => row.inUse) ? (
              <p id={`${uid}-help`} className="text-xs text-muted-foreground">
                Greyed-out values are used by products, so only their label can change and they stay active.
              </p>
            ) : null}
          </>
        )}
        {status && !status.ok ? (
          <p role="alert" className="text-xs text-destructive">
            {status.message}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center">
          <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
            <Link href={`/admin/settings/new?list=${encodeURIComponent(listKey)}`}>
              <Plus className="size-4" aria-hidden="true" />
              Add value
            </Link>
          </Button>
          <p role="status" className="text-xs text-muted-foreground sm:ml-2">
            {status?.ok ? <span key={status.at}>{status.message}</span> : null}
          </p>
          <Button type="submit" className={SAVE_CLASS} disabled={!dirty || pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </section>
  );
}
