import { Truck, Wallet } from "lucide-react";
import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { policyCopy } from "@/lib/policy-copy";

function SectionIcon({ icon: Icon }: { icon: typeof Truck }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold">
      <Icon className="h-4 w-4" />
    </span>
  );
}

// Fully static content, no DB fetch — render it for real.
export default function PoliciesLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Policies" }]} />
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Policies"
          title="Shipping, returns, authenticity"
          subtitle="Plain-language details on how we ship, what we accept back, and where our stock comes from."
        />
        <SectionCard eyebrow="Operations" title="How we fulfil orders" actions={<SectionIcon icon={Truck} />}>
          <DisclosureAccordion
            items={[
              {
                id: "shipping",
                label: policyCopy.shipping.label,
                defaultOpen: true,
                content: <p>{policyCopy.shipping.body}</p>,
              },
              {
                id: "returns",
                label: policyCopy.returns.label,
                defaultOpen: true,
                content: <p>{policyCopy.returns.body}</p>,
              },
              {
                id: "privacy",
                label: policyCopy.privacy.label,
                content: <p>{policyCopy.privacy.body}</p>,
              },
            ]}
          />
        </SectionCard>
        <SectionCard eyebrow="Money" title="Payment & verification" actions={<SectionIcon icon={Wallet} />}>
          <DisclosureAccordion
            items={[
              {
                id: "payment-methods",
                label: "How payment works",
                content: (
                  <p>
                    We don&apos;t run a card or e-wallet gateway — you pay by scanning one of our
                    bank or e-wallet QR codes at checkout, then upload a screenshot of the
                    receipt. A person checks every receipt by hand before your stock is reserved,
                    so verification can take up to one business day.
                  </p>
                ),
              },
              {
                id: "order-changes",
                label: "Changing or cancelling an order",
                content: (
                  <p>
                    Email us before your receipt is verified and we can usually adjust or cancel
                    the order outright. After verification, cancellation is still possible but
                    requires a reason and may take a little longer while we release any reserved
                    stock.
                  </p>
                ),
              },
            ]}
          />
        </SectionCard>
      </div>
    </main>
  );
}
