"use client";

import { useState, useTransition } from "react";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleWishlist } from "@/actions/account-actions";

export function WishlistButton({
  productId,
  initiallySaved = false,
  variant = "default",
}: {
  productId: string;
  initiallySaved?: boolean;
  variant?: "default" | "icon";
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [isPending, startTransition] = useTransition();
  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        aria-pressed={saved}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              const next = await toggleWishlist(productId);
              setSaved(next.saved);
              toast.success(next.saved ? "Saved to wishlist" : "Removed from wishlist");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Please sign in to save items");
            }
          })
        }
        className="h-11 w-11 shrink-0"
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Heart className={cn("h-5 w-5", saved ? "fill-current" : "")} />
        )}
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-11 rounded-md"
      disabled={isPending}
      aria-pressed={saved}
      onClick={() =>
        startTransition(async () => {
          try {
            const next = await toggleWishlist(productId);
            setSaved(next.saved);
            toast.success(next.saved ? "Saved to wishlist" : "Removed from wishlist");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Please sign in to save items");
          }
        })
      }
    >
      {isPending ? <Loader2 className="animate-spin" /> : <Heart className={saved ? "fill-current" : ""} />}
      {isPending ? "Saving…" : saved ? "Saved" : "Save"}
    </Button>
  );
}
