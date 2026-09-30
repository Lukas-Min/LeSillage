import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FORM_ACTION_CLASS } from "@/components/ui/form-action";
import { AreaHeader, MiniStatsSkeleton, PAGE_ACTION_CLASS, PageColumns } from "@/components/ui/page-layout";

const inlineSkeleton = "skeleton-shine inline-block rounded-md bg-muted align-middle";

/** Same layout as the page: header, then the Summary column and the form. */
export default function EditPromoCodeLoading() {
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Promo code"
        title={
          <>
            Edit <span className={`${inlineSkeleton} h-7 w-36`} />
          </>
        }
        badge={<Skeleton className="h-5 w-14" />}
        actions={
          <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
            <Link href="/admin/promo?tab=codes">Back</Link>
          </Button>
        }
      />
      <PageColumns
        side={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <MiniStatsSkeleton labels={["Used", "Status", "Ends", "Minimum"]} wide={["Minimum"]} />
            </CardContent>
          </Card>
        }
        main={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Promo code</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {["Code", "Discounts", "Type"].map((label) => (
                  <div key={label} className="space-y-1">
                    <Label>{label}</Label>
                    <Skeleton className="h-11 w-full" />
                  </div>
                ))}
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-11 w-full" />
                </div>
                {["Minimum spend (₱, optional)", "Max redemptions (optional)", "Starts (optional)", "Ends (optional)"].map(
                  (label) => (
                    <div key={label} className="space-y-1">
                      <Label>{label}</Label>
                      <Skeleton className="h-11 w-full" />
                    </div>
                  ),
                )}
                <div className="space-y-1 sm:col-span-2">
                  <Label>Customers who can use it</Label>
                  <Skeleton className="h-11 w-full" />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for every customer. Add even one and only the customers listed here can use the code.
                  </p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Description (optional)</Label>
                  <Skeleton className="h-16 w-full" />
                  <p className="text-xs text-muted-foreground">Goes in the email customers get about this code, and under the code in their Account → Promo codes.</p>
                </div>
                {["First order only", "Once per customer"].map((label) => (
                  <div key={label} className="flex min-h-11 items-center gap-2 text-sm">
                    <Skeleton className="size-4 rounded-sm" />
                    {label}
                  </div>
                ))}
                <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" disabled className="size-4" />
                  Email the customer(s) who can still use this code
                </label>
                <p className="-mt-2 text-xs text-muted-foreground sm:col-span-2">
                  Customers who turned off news and promotions aren&apos;t emailed. They still see the code under Account →
                  Promo codes.
                </p>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Amount is a plain percent for a Percentage discount and pesos for a Fixed/₱ one; minimum spend is always
                  pesos. Active or inactive stays on the promo codes list, and the{" "}
                  <span className={`${inlineSkeleton} h-3 w-3`} /> redemption(s) already recorded are never changed here.
                </p>
                <div className="sm:col-span-2">
                  <Button type="button" disabled className={FORM_ACTION_CLASS}>
                    Save changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
