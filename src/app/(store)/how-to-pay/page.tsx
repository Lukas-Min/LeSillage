import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";

export default function HowToPayPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "How to pay" }]} />
      <header className="space-y-2">
        <Eyebrow>Help</Eyebrow>
        <h1 className="font-serif-display text-4xl">How to pay</h1>
      </header>
      <Card className="max-w-3xl rounded-md">
        <CardContent className="space-y-3 p-6 text-sm leading-relaxed">
          <p>1. Place your order on the checkout page.</p>
          <p>2. Pay the total using any of our bank or e-wallet QR codes.</p>
          <p>3. Upload a screenshot of your receipt on the payment page.</p>
          <p>4. We will verify and confirm by email within one business day.</p>
          <p className="text-muted-foreground">
            Stock is reserved only after your receipt is verified. If something becomes unavailable,
            we will reach out with options.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
