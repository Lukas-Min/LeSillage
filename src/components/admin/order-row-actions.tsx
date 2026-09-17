"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adminTransitionOrder } from "@/actions/admin-actions";
import { canTransition, confirmBlockedReason } from "@/domain/order-state";
import type { FulfillmentMethod, OrderStatus, TesterResult } from "@/db/schema";

// Forward transitions this component can offer, keyed by the current status
// — CONFIRMED branches on fulfillmentMethod since a delivery order ships
// while a pickup order goes straight to "ready for pickup" (see
// src/domain/order-state.ts for why those are parallel, not sequential,
// steps). Only one forward button is ever shown per status, so this is a
// plain lookup rather than a switch.
function nextForwardStep(
  status: OrderStatus,
  fulfillmentMethod: FulfillmentMethod,
): { next: OrderStatus; label: string } | null {
  switch (status) {
    case "RECEIPT_SUBMITTED":
      return { next: "CONFIRMED", label: "Confirm" };
    case "CONFIRMED":
      return fulfillmentMethod === "PICKUP"
        ? { next: "READY_FOR_PICKUP", label: "Mark ready for pickup" }
        : { next: "SHIPPED", label: "Mark shipped" };
    case "SHIPPED":
      return { next: "DELIVERED", label: "Mark delivered" };
    case "DELIVERED":
    case "READY_FOR_PICKUP":
      return { next: "COMPLETED", label: "Mark completed" };
    default:
      return null;
  }
}

export function OrderRowActions({
  orderId,
  status,
  fulfillmentMethod,
  promoTesterResult,
}: {
  orderId: string;
  status: OrderStatus;
  fulfillmentMethod: FulfillmentMethod;
  /** Confirm is held while this is PENDING — the order earned a free tester
   *  nobody has picked yet (`confirmBlockedReason`). */
  promoTesterResult: TesterResult | null;
}) {
  const [showReason, setShowReason] = useState<"REJECTED" | "CANCELLED" | null>(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const advance = (next: OrderStatus, successLabel: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("orderId", orderId);
      formData.set("next", next);
      const result = await adminTransitionOrder(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(successLabel);
    });
  };

  const submitWithReason = (next: "REJECTED" | "CANCELLED") => {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("orderId", orderId);
      formData.set("next", next);
      formData.set("reason", reason);
      const result = await adminTransitionOrder(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(next === "REJECTED" ? "Order rejected" : "Order cancelled");
      setReason("");
      setShowReason(null);
    });
  };

  const forward = nextForwardStep(status, fulfillmentMethod);
  const blocked = forward ? confirmBlockedReason({ next: forward.next, promoTesterResult }) : null;
  // Once verification is past (SHIPPED/DELIVERED/READY_FOR_PICKUP onward),
  // rejecting no longer makes sense — that's what the no-show Cancel below
  // is for on the pickup side.
  const canReject = canTransition(status, "REJECTED");
  // Scoped to the one case this was asked for: a pickup order nobody
  // collected. Earlier-stage cancellation is the customer's own call
  // (CancelOrderButton) or admin's Reject.
  const canAdminCancel = status === "READY_FOR_PICKUP";

  return (
    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
      {blocked ? <p className="text-xs text-amber-600 sm:max-w-xs sm:text-right">{blocked}</p> : null}
      {forward ? (
        <Button
          onClick={() => advance(forward.next, `Order ${forward.next.toLowerCase().replace(/_/g, " ")}`)}
          disabled={isPending || Boolean(blocked)}
          aria-busy={isPending}
          title={blocked ?? undefined}
        >
          {forward.label}
        </Button>
      ) : null}
      {canReject ? (
        <Button
          variant="destructive"
          onClick={() => setShowReason("REJECTED")}
          disabled={isPending}
        >
          Reject
        </Button>
      ) : null}
      {canAdminCancel ? (
        <Button
          variant="destructive"
          onClick={() => setShowReason("CANCELLED")}
          disabled={isPending}
        >
          Cancel (no-show)
        </Button>
      ) : null}
      {showReason ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Textarea
            placeholder={showReason === "REJECTED" ? "Reason for rejection" : "Reason for cancellation"}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            maxLength={280}
            disabled={isPending}
          />
          <Button
            onClick={() => submitWithReason(showReason)}
            variant="destructive"
            disabled={isPending || !reason.trim()}
            aria-busy={isPending}
          >
            {showReason === "REJECTED" ? "Confirm reject" : "Confirm cancel"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
