import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SummaryLinesSkeleton } from "@/components/store/loading";
import { PHONE_COUNTRY } from "@/domain/phone";

// Mirrors CheckoutForm (src/components/store/checkout-form.tsx) on its
// initial Delivery state: card headings, field labels and fixed copy render
// for real; the controls (whose values come from the account, saved
// addresses, provinces and the cart) and every amount are skeletoned. The
// optional "Saved address" select only exists for a customer with saved
// addresses, which this fallback can't know, so it isn't reserved.
export default function CheckoutLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="font-serif-display text-2xl">Checkout</h1>
      <p className="text-sm text-muted-foreground">All amounts shown are in Philippine pesos (₱).</p>
      <div className="mt-6 space-y-6">
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="font-serif-display text-lg">Fulfillment</h2>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-11 rounded-lg" />
              <Skeleton className="h-11 rounded-lg" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-full sm:w-2/3" />
              <Skeleton className="h-3 w-1/2 sm:hidden" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Recipient name</Label>
              <Skeleton className="h-11 rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Skeleton className="h-11 rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Mobile</Label>
              <div className="flex items-stretch gap-2">
                <span className="inline-flex items-center rounded-md border bg-secondary px-3 text-sm">
                  {PHONE_COUNTRY}
                </span>
                <Skeleton className="h-11 flex-1 rounded-lg" />
              </div>
              <p className="text-xs text-muted-foreground">10 digits starting with 9. Do not include +63 or 0.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            {["Province", "City / Municipality", "Barangay", "Postal code"].map((label) => (
              <div key={label} className="space-y-1">
                <Label>{label}</Label>
                <Skeleton className="h-11 rounded-lg" />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2">
              <Label>Street address</Label>
              <Skeleton className="h-11 rounded-lg" />
            </div>
            <div className="flex items-center gap-2 text-sm sm:col-span-2">
              <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-sm" />
              Save this address to my account
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <Label>Order notes (optional)</Label>
            <Skeleton className="h-16 rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1">
              <Label>Promo codes</Label>
              <p className="text-xs text-muted-foreground">One order code and one delivery code can be used together.</p>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-11 flex-1 rounded-lg" />
              <Skeleton className="h-11 w-[72px] rounded-lg" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-sm">
            <h2 className="font-serif-display text-lg">Order summary</h2>
            <SummaryLinesSkeleton className="mt-4" />
            <Separator className="my-4" />
            <div className="space-y-1.5 text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Merchandise subtotal</span>
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery</span>
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <span className="font-serif-display text-lg">Total to pay</span>
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="mt-4 flex items-start gap-2 border-t pt-4 text-xs text-muted-foreground">
              <Skeleton className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm" />
              <span>I accept the policies and understand that payment is by QR upload and that stock is not reserved until the receipt is verified.</span>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="button" variant="gold" size="lg" className="h-11 w-full rounded-md sm:w-auto" disabled>
            Place order
          </Button>
        </div>
      </div>
    </main>
  );
}
