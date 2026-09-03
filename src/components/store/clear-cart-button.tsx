"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
import { useCart } from "@/components/store/cart-context";
import { cn } from "@/lib/utils";

export function ClearCartButton({ className }: { className?: string }) {
  const cart = useCart();
  const [clearing, startClear] = useTransition();

  if (cart.items.length === 0) return null;

  function handleClear() {
    startClear(async () => {
      try {
        await cart.clear();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not clear bag", { id: "cart-clear" });
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-7 gap-1.5 px-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground", className)}
        >
          {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Clear bag
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear your bag?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes every item from your bag. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleClear}>
            Clear bag
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
