import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { policyCopy } from "@/lib/policy-copy";

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
        <SectionCard eyebrow="Operations" title="How we fulfil orders">
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
      </div>
    </main>
  );
}
