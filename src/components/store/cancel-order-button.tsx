"use client";

import { useTransition } from "react";
import { Loader2, X } from "lucide-react";
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
import { cancelOrder } from "@/actions/order-actions";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [cancelling, startCancel] = useTransition();

  function handleCancel() {
    startCancel(async () => {
      try {
        await cancelOrder(orderId);
        toast.success("Order cancelled");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not cancel order", { id: "cancel-order" });
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={cancelling}>
          {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Cancel order
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>
            This can&apos;t be undone. If you&apos;ve already paid, contact us for a refund.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep order</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleCancel}>
            Cancel order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
