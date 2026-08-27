import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { policyCopy } from "@/lib/policy-copy";

export const metadata = {
  title: "Policies · Le Sillage",
};

export default function PoliciesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:py-12">
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
    </main>
  );
}
