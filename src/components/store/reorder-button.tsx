"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/cart-context";
import { reorderOrderItems } from "@/actions/order-actions";

/**
 * "Re-order" for a finished order: puts its lines back in the bag via
 * reorderOrderItems, then refreshes the cart context so the header badge
 * and drawer reflect the new lines without a reload. The drawer's open state
 * is internal to its Sheet, so instead of popping it the success toast
 * offers a "View bag" link.
 */
export function ReorderButton({ orderId }: { orderId: string }) {
  const cart = useCart();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleReorder() {
    startTransition(async () => {
      const result = await reorderOrderItems(orderId);
      if (!result.ok) {
        toast.error(result.error, { id: "reorder" });
        return;
      }
      await cart.refresh();
      if (result.added === 0) {
        toast.error("None of these items are available any more", { id: "reorder" });
        return;
      }
      toast.success(
        `${result.added} ${result.added === 1 ? "item" : "items"} added to your bag`,
        {
          id: "reorder",
          action: { label: "View bag", onClick: () => router.push("/cart") },
        },
      );
      if (result.unavailable.length > 0) {
        toast.warning(`No longer available: ${result.unavailable.join(", ")}`, {
          id: "reorder-unavailable",
          duration: 8000,
        });
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleReorder}
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      Re-order
    </Button>
  );
}
