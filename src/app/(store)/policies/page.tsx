import { Truck, Wallet } from "lucide-react";
import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { policyCopy } from "@/lib/policy-copy";

export const metadata = {
  title: "Policies · Le Sillage",
};

function SectionIcon({ icon: Icon }: { icon: typeof Truck }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold">
      <Icon className="h-4 w-4" />
    </span>
  );
}

export default function PoliciesPage() {
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
                label: policyCopy.payment.label,
                content: <p>{policyCopy.payment.body}</p>,
              },
              {
                id: "order-changes",
                label: policyCopy.orderChanges.label,
                content: <p>{policyCopy.orderChanges.body}</p>,
              },
            ]}
          />
        </SectionCard>
      </div>
    </main>
  );
}
