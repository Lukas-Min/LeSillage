import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewCustomerPromoCodeLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-2xl">Add promo code</h1>
          <Skeleton className="h-5 w-40" />
        </div>
        {/* The Back link needs the userId, which loading.tsx can't read — same look, not yet a link. */}
        <Button asChild variant="outline" className="h-11">
          <span>Back</span>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {["Code", "Discount %", "Redemptions"].map((label) => (
              <div key={label} className="space-y-1">
                <Label>{label}</Label>
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-3">
              <Label>Description (optional)</Label>
              <Skeleton className="h-16 w-full" />
              <p className="text-xs text-muted-foreground">Goes in the email customers get about this code, and under the code in their Account → Promo codes.</p>
            </div>
            <div className="flex min-h-11 items-center gap-2 text-sm sm:col-span-3">
              <Skeleton className="size-4" />
              Email this customer their code (if they get news and promotions)
            </div>
            <div className="flex justify-end sm:col-span-3">
              <Button asChild className="h-11 w-full sm:w-auto">
                <span>Save</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
