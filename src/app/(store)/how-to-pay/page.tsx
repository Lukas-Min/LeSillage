import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow, PageHeader, SectionCard } from "@/components/ui/section";
import { HOW_TO_PAY_STEPS } from "@/lib/how-to-pay-copy";

export const metadata: Metadata = {
  title: "How to Pay",
  description: "How payment works at Le Sillage Manila — QR code, receipt upload, and stock reservation.",
  alternates: { canonical: "/how-to-pay" },
};

export default function HowToPayPage() {
  return (
    <main className="w-full space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "How to pay" }]} />
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Help"
          title="How to pay"
          subtitle="No card gateway — payment is by QR code, verified by hand."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {HOW_TO_PAY_STEPS.map((step) => (
            <div key={step.number} className="space-y-2 rounded-lg border border-border bg-card p-5">
              <Eyebrow>{step.number}</Eyebrow>
              <p className="font-serif-display text-lg leading-tight">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
        <SectionCard eyebrow="Good to know" title="Held for one hour">
          <p className="text-sm leading-relaxed text-muted-foreground">
            On-hand stock is held for one hour from when you place the order. Upload your receipt
            in that hour or the order is cancelled and the hold is released.
          </p>
        </SectionCard>
      </div>
    </main>
  );
}
