"use client";

import { useTransition } from "react";
import { Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmOrderReceived } from "@/actions/order-actions";

/**
 * Customer's own "I received it" button, shown only while a delivery order
 * is DELIVERED. The self-service counterpart to the day-2 email's one-tap
 * link and the day-3 auto-complete cron — whichever happens first wins,
 * since transitionOrderStatus's assertTransition makes a second attempt on
 * an already-COMPLETED order a no-op error rather than a double-send.
 */
export function ConfirmReceivedButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmOrderReceived(orderId);
      if (!result.ok) {
        toast.error(result.error, { id: "confirm-received" });
        return;
      }
      toast.success("Marked as received — thanks!", { id: "confirm-received" });
    });
  }

  return (
    <Button type="button" size="sm" onClick={handleConfirm} disabled={isPending} aria-busy={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
      Mark as received
    </Button>
  );
}
