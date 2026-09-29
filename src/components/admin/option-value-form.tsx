"use client";

import { useActionState } from "react";
import { createOptionValue, type OptionListResult } from "@/actions/option-list-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

/** The add-value form on /admin/settings/new. On success the action goes back to /admin/settings. */
export function OptionValueForm({ listKey }: { listKey: string }) {
  const [state, action] = useActionState<OptionListResult | null, FormData>(createOptionValue, null);
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="listKey" value={listKey} />
      <div className="space-y-1">
        <Label htmlFor="option-value">Value</Label>
        <Input id="option-value" name="value" required maxLength={64} placeholder="e.g. SPICY" aria-describedby="option-value-help" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="option-label">Label</Label>
        <Input id="option-label" name="label" required maxLength={80} placeholder="e.g. Spicy" />
      </div>
      <p id="option-value-help" className="text-xs text-muted-foreground sm:col-span-2">
        The value is what products store, written in capitals like the others (SPICY). The label is what customers and
        admins see. A value can&apos;t be renamed once products use it.
      </p>
      {state && !state.ok ? (
        <p role="alert" className="text-xs text-destructive sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <SubmitButton className="h-11 w-full sm:ml-auto sm:block sm:w-fit" pendingLabel="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
