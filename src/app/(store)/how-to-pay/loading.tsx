import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow, PageHeader, SectionCard } from "@/components/ui/section";
import { HOW_TO_PAY_STEPS } from "@/lib/how-to-pay-copy";

// Fully static content, no DB fetch — render it for real.
export default function HowToPayLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
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
        <SectionCard eyebrow="Good to know" title="Stock isn't reserved until verified">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Stock is reserved only once your receipt is verified — not the moment you place the
            order. If something becomes unavailable in that window, we&apos;ll reach out with
            options before doing anything else.
          </p>
        </SectionCard>
      </div>
    </main>
  );
}
