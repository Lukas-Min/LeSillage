"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmDeliveryByToken } from "@/actions/order-actions";

/**
 * The one-tap confirmation for the day-2 "did you receive it?" email.
 * Deliberately a button the visitor presses, not something the page fires
 * on load — an email client or security scanner prefetching the link
 * itself must not be able to complete the order.
 */
export function DeliveryConfirmForm({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: true } | { ok: false; error: string } | null>(null);

  function handleConfirm() {
    startTransition(async () => {
      const res = await confirmDeliveryByToken(token);
      setResult(res);
    });
  }

  if (result?.ok) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="h-5 w-5" />
        Thanks — this order is marked as received.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={handleConfirm} disabled={isPending} aria-busy={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Yes, I received it
      </Button>
      {result && !result.ok ? <p className="text-sm text-destructive">{result.error}</p> : null}
    </div>
  );
}
