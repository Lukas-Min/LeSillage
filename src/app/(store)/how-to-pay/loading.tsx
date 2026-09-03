import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";

// Fully static content, no DB fetch — render it for real.
export default function HowToPayLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "How to pay" }]} />
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <Eyebrow>Help</Eyebrow>
          <h1 className="font-serif-display text-4xl">How to pay</h1>
        </header>
        <Card className="rounded-md">
          <CardContent className="space-y-3 p-6 text-sm leading-relaxed">
            <p>1. Place your order at checkout, choosing delivery or pickup.</p>
            <p>
              2. On the payment page, scan whichever QR code matches how you want to pay — bank
              transfer, GCash, Maya, or another e-wallet — and send the exact total shown.
            </p>
            <p>3. Upload a screenshot of your receipt on that same page.</p>
            <p>4. We verify it by hand and confirm by email, usually within one business day.</p>
            <p className="text-muted-foreground">
              Stock is reserved only once your receipt is verified — not the moment you place the
              order. If something becomes unavailable in that window, we&apos;ll reach out with
              options before doing anything else.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
