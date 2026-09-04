import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPromoLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Promo & delivery</h1>
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {["Settings", "Promo codes"].map((label) => (
          <span key={label} className="min-h-11 border-b-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </span>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <Label>Free-shipping threshold (₱)</Label>
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="space-y-1">
            <Label>Delivery fee (₱)</Label>
            <Skeleton className="h-11 w-full" />
          </div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-40" />
          <div className="space-y-1">
            <Label>Decant pre-order threshold (ml)</Label>
            <Skeleton className="h-11 w-full" />
            <p className="text-xs text-muted-foreground">
              When remaining ml drops below this, every size on that fragrance becomes pre-order.
            </p>
          </div>
          <Skeleton className="h-5 w-64" />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Competes with each product&apos;s own discount — whichever saves the customer more wins, they never stack.
          </p>
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    </div>
  );
}
