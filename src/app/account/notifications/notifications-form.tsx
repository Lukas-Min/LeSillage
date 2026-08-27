"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateNotificationPreferences } from "@/actions/account-actions";

export function NotificationsForm({ initial }: { initial: boolean }) {
  const [optIn, setOptIn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const fd = new FormData();
      if (optIn) fd.set("marketingOptIn", "on");
      await updateNotificationPreferences(fd);
      setSavedAt(new Date());
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3 text-sm">
        <input
          type="checkbox"
          name="marketingOptIn"
          checked={optIn}
          onChange={(event) => setOptIn(event.target.checked)}
          className="mt-1"
        />
        <div>
          <p className="font-medium">Send me news and promotions</p>
          <p className="text-xs text-muted-foreground">
            Occasional updates about new fragrances, restocks, and limited offers. No more than once a week.
          </p>
        </div>
      </label>
      {savedAt ? (
        <p className="flex items-center gap-1 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Preferences saved.
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}