"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleWishlist } from "@/actions/account-actions";

export function WishlistButton({
  productId,
  initiallySaved = false,
}: {
  productId: string;
  initiallySaved?: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
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
      <Heart className={saved ? "fill-current" : ""} />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
