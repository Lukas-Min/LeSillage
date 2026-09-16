"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  adminConfirmReceipt,
  adminMarkShipped,
  adminTransitionOrder,
} from "@/actions/admin-actions";
import type { OrderStatus } from "@/db/schema";

export function OrderRowActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [showReason, setShowReason] = useState<"REJECTED" | "CANCELLED" | null>(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  // Each forward button maps to the action that performs exactly that
  // transition: Confirm (RECEIPT_SUBMITTED → CONFIRMED) is adminConfirmReceipt,
  // Mark shipped (CONFIRMED → SHIPPED) is adminMarkShipped.
  const confirm = (next: "CONFIRMED" | "SHIPPED") => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("orderId", orderId);
      const result =
        next === "CONFIRMED" ? await adminConfirmReceipt(formData) : await adminMarkShipped(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Order ${next.toLowerCase()}`);
    });
  };

  const reject = () => {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("orderId", orderId);
      formData.set("next", "REJECTED");
      formData.set("reason", reason);
      const result = await adminTransitionOrder(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Order rejected");
      setReason("");
      setShowReason(null);
    });
  };

  return (
    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
      {status === "RECEIPT_SUBMITTED" ? (
        <Button
          onClick={() => confirm("CONFIRMED")}
          disabled={isPending}
          aria-busy={isPending}
        >
          Confirm
        </Button>
      ) : null}
      {status === "CONFIRMED" ? (
        <Button
          onClick={() => confirm("SHIPPED")}
          disabled={isPending}
          aria-busy={isPending}
        >
          Mark shipped
        </Button>
      ) : null}
      {status !== "COMPLETED" && status !== "REJECTED" && status !== "CANCELLED" && status !== "SHIPPED" ? (
        <Button
          variant="destructive"
          onClick={() => setShowReason("REJECTED")}
          disabled={isPending}
        >
          Reject
        </Button>
      ) : null}
      {showReason === "REJECTED" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Textarea
            placeholder="Reason for rejection"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            maxLength={280}
            disabled={isPending}
          />
          <Button
            onClick={reject}
            variant="destructive"
            disabled={isPending || !reason.trim()}
            aria-busy={isPending}
          >
            Confirm reject
          </Button>
        </div>
      ) : null}
    </div>
  );
}
