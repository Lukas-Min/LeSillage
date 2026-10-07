import type * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MAX_ANNOUNCEMENT_LENGTH, MAX_ANNOUNCEMENT_MESSAGES } from "@/domain/announcement";
import { FORM_ACTION_CLASS } from "@/components/ui/form-action";
import { PageColumns } from "@/components/ui/page-layout";

/**
 * The two /admin/promo tabs are query-string navigation on one route, so
 * `loading.tsx` alone never retriggers when you switch between them — each tab
 * fetches inside its own Suspense boundary and falls back to the matching
 * skeleton here. `loading.tsx` reuses the settings one for the first paint,
 * since it can't read `?tab` to know which tab is being opened.
 */
export function PromoSettingsSkeleton() {
  return (
    <PageColumns
      main={
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery & tester</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Free-shipping threshold (₱)</Label>
                <Skeleton className="h-11 w-full" />
              </div>
              <div className="space-y-1">
                <Label>Delivery fee (₱)</Label>
                <Skeleton className="h-11 w-full" />
              </div>
              <div className="space-y-1">
                <Label>Decant pre-order threshold (ml)</Label>
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Skeleton className="size-3.5 rounded-sm" />
              Free shipping enabled
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Skeleton className="size-3.5 rounded-sm" />
              Tester bonus enabled
            </div>
            <p className="text-xs text-muted-foreground">
              On an order over the decant threshold, delivered or picked up, assigns one in-stock SKU marked Tester.
              Those SKUs stay listed in the shop.
            </p>
            <p className="text-xs text-muted-foreground">
              When remaining ml on an In-house decant drops below this, every In-house size on that fragrance becomes
              pre-order. Retail decants ignore this pool and use their own stock.
            </p>
            <p className="text-xs text-muted-foreground">
              Free-shipping threshold and delivery fee are entered in pesos (add a period for centavos) — not centavos.
            </p>
            <Button type="button" disabled className={FORM_ACTION_CLASS}>
              Save
            </Button>
          </CardContent>
        </Card>
      }
      side={
        <>
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">Site-wide discount</CardTitle>
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex min-h-11 items-center gap-2 text-sm">
                <Skeleton className="size-4 rounded-sm" />
                On (applies to every fragrance)
              </div>
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Skeleton className="h-11 w-full" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-11 w-full" />
                </div>
                {["Starts (optional)", "Ends (optional)"].map((label) => (
                  <div key={label} className="space-y-1">
                    <Label>{label}</Label>
                    <Skeleton className="h-11 w-full" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Competes with each product&apos;s own discount — whichever saves the customer more wins, they never stack. No
                start date means it starts as soon as it&apos;s on; no end date means it doesn&apos;t expire. Dates are Manila
                days, and the end date is the last full day of the sale. Turning it on emails everyone subscribed to news and
                promotions once; saving it again while it&apos;s on doesn&apos;t.
              </p>
              <Button type="button" disabled className={FORM_ACTION_CLASS}>
                Save
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Announcement bar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex min-h-11 items-center gap-2 text-sm">
                <Skeleton className="size-4 rounded-sm" />
                Show the announcement bar
              </div>
              <div className="space-y-1">
                <Label>Messages — one per line</Label>
                <Skeleton className="h-20 w-full" />
                <p className="text-xs text-muted-foreground">
                  Up to {MAX_ANNOUNCEMENT_MESSAGES} lines, {MAX_ANNOUNCEMENT_LENGTH} characters each. They scroll in the order
                  written and loop continuously, so a line can follow on from the one above it. A promo code written in
                  capitals (WELCOME10) is emphasised automatically. Keep them true to the codes and thresholds set on this
                  page — customers read this before anything else.
                </p>
              </div>
              <Button type="button" disabled className={FORM_ACTION_CLASS}>
                Save
              </Button>
            </CardContent>
          </Card>
        </>
      }
    />
  );
}

export function PromoCodesSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Existing codes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-11 w-15" />
                <Skeleton className="h-11 w-26" />
                <Skeleton className="h-11 w-20" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm";
const inlineSkeleton = "skeleton-shine inline-block rounded-md bg-muted align-middle";

/**
 * PromoCodeForm's loading shape: the "Promo code" card, then "Who can use it"
 * and "Options" in the side column, then the button. "create" is a blank form,
 * so it shows the real controls disabled (Order subtotal, Percentage, Same for
 * every type); "edit" skeletons each value. The "Per product type" card only
 * shows for a code with different amounts per type, which loading can't know,
 * so it's left out and the amount field is one skeleton-labelled field.
 */
export function PromoCodeFormSkeleton({ mode }: { mode: "create" | "edit" }) {
  const field = (label: React.ReactNode, control: React.ReactNode, key?: string) => (
    <div key={key} className="space-y-1">
      {typeof label === "string" ? <Label>{label}</Label> : label}
      {control}
    </div>
  );
  const box = <Skeleton className="h-11 w-full" />;
  const create = mode === "create";
  return (
    <div className="space-y-4">
      <PageColumns
        main={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Promo code</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {create ? (
                <>
                  {field("Code", <Input placeholder="WELCOME10" disabled className="font-price-display uppercase" />)}
                  {field(
                    "Discounts",
                    <select disabled className={selectClass}>
                      <option>Order subtotal</option>
                    </select>,
                  )}
                  {field(
                    "Type",
                    <select disabled className={selectClass}>
                      <option>Percentage</option>
                    </select>,
                  )}
                  {field(
                    "Amount per product type",
                    <select disabled className={selectClass}>
                      <option>Same for every type</option>
                    </select>,
                  )}
                  {field("Amount (%)", <Input type="number" disabled />)}
                  {field("Minimum spend (₱, optional)", <Input type="number" placeholder="e.g. 2000" disabled />)}
                  {field("Max redemptions (optional)", <Input type="number" placeholder="Unlimited" disabled />)}
                  {field("Starts (optional)", <Input type="date" disabled />)}
                  {field("Ends (optional)", <Input type="date" disabled />)}
                </>
              ) : (
                <>
                  {["Code", "Discounts", "Type"].map((label) => field(label, box, label))}
                  {field(<Skeleton className="h-3.5 w-20" />, box)}
                  {["Minimum spend (₱, optional)", "Max redemptions (optional)", "Starts (optional)", "Ends (optional)"].map(
                    (label) => field(label, box, label),
                  )}
                </>
              )}
              <div className="space-y-1 sm:col-span-2">
                <Label>Description (optional)</Label>
                {create ? (
                  <Textarea
                    disabled
                    placeholder="e.g. Thank you for being a loyal customer — enjoy this on your next order."
                  />
                ) : (
                  <Skeleton className="h-16 w-full" />
                )}
                <p className="text-xs text-muted-foreground">
                  Goes in the email customers get about this code, and under the code in their Account → Promo codes.
                </p>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Amount is a plain percent for a Percentage discount and pesos for a Fixed/₱ one; minimum spend is always
                pesos.
                {create ? null : (
                  <>
                    {" "}
                    Active or inactive stays on the promo codes list, and the{" "}
                    <span className={`${inlineSkeleton} h-3 w-3`} /> redemption(s) already recorded are never changed
                    here.
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        }
        side={
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Who can use it</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <Label>Customers who can use it</Label>
                {create ? (
                  <div
                    aria-disabled="true"
                    className="flex min-h-11 w-full cursor-not-allowed items-center gap-2 rounded-lg border border-input px-2 py-1.5 text-sm opacity-50"
                  >
                    <span className="flex-1 px-1 text-muted-foreground">Every customer</span>
                    <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  </div>
                ) : (
                  box
                )}
                <p className="text-xs text-muted-foreground">
                  Leave empty for every customer. Add even one and only the customers listed here can use the code.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Options</CardTitle>
              </CardHeader>
              <CardContent>
                {["First order only", "Once per customer"].map((label) =>
                  create ? (
                    <label key={label} className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="checkbox" disabled className="size-4" />
                      {label}
                    </label>
                  ) : (
                    <div key={label} className="flex min-h-11 items-center gap-2 text-sm">
                      <Skeleton className="size-4 rounded-sm" />
                      {label}
                    </div>
                  ),
                )}
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" disabled className="size-4" />
                  Email the customer(s) who can still use this code
                </label>
                <p className="text-xs text-muted-foreground">
                  Customers who turned off news and promotions aren&apos;t emailed. They still see the code under Account →
                  Promo codes.
                </p>
              </CardContent>
            </Card>
          </>
        }
      />
      <Button type="button" disabled className={FORM_ACTION_CLASS}>
        {create ? "Create code" : "Save changes"}
      </Button>
    </div>
  );
}
