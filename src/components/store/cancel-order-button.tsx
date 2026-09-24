"use client";

import { useState, useTransition } from "react";
import { Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cancelOrder, requestOrderCancellation } from "@/actions/order-actions";
import { customerCancelMode } from "@/domain/order-state";
import type { OrderStatus } from "@/db/schema";

// AWAITING_PAYMENT/RECEIPT_SUBMITTED cancel instantly; a CONFIRMED order can
// only be *requested* for cancellation — an admin has to approve it (see
// customerCancelMode in src/domain/order-state.ts). cancellationRequestedAt
// being set means that request is already in, so this renders as a plain
// pending indicator instead of a button.
export function CancelOrderButton({
  orderId,
  status,
  cancellationRequestedAt,
}: {
  orderId: string;
  status: OrderStatus;
  cancellationRequestedAt: Date | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelling, startCancel] = useTransition();

  if (cancellationRequestedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        Cancellation requested — we&apos;ll email you once it&apos;s reviewed
      </span>
    );
  }

  const mode = customerCancelMode(status);
  if (!mode) return null;

  const isRequest = mode === "REQUEST";

  function handleConfirm() {
    if (!reason.trim()) {
      toast.error("A reason is required", { id: "cancel-order" });
      return;
    }
    startCancel(async () => {
      const result = isRequest
        ? await requestOrderCancellation(orderId, reason.trim())
        : await cancelOrder(orderId, reason.trim());
      if (!result.ok) {
        toast.error(result.error, { id: "cancel-order" });
        return;
      }
      toast.success(isRequest ? "Cancellation requested" : "Order cancelled");
      setOpen(false);
      setReason("");
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setReason("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <X className="h-4 w-4" />
          {isRequest ? "Request cancellation" : "Cancel order"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isRequest ? "Request to cancel this order?" : "Cancel this order?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isRequest
              ? "Your payment's already been verified, so this needs a quick review before it's cancelled — we'll email you either way."
              : "This can't be undone. If you've already paid, contact us for a refund."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <label htmlFor={`cancel-reason-${orderId}`} className="text-sm font-medium">
            Reason
          </label>
          <Textarea
            id={`cancel-reason-${orderId}`}
            placeholder="e.g. Changed my mind, found it elsewhere, ordered by mistake"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            maxLength={280}
            disabled={cancelling}
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelling}>Keep order</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
            disabled={cancelling || !reason.trim()}
          >
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isRequest ? "Request cancellation" : "Cancel order"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
