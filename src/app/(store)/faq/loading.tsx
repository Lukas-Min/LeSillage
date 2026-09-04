import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { FaqGroupList } from "@/components/store/faq-groups";

// Fully static content — render the same groups as page.tsx.
export default function FaqLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "FAQs" }]} />
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Help"
          title="Frequently asked questions"
          subtitle="Ordering, payment, shipping, and everything in between."
        />
        <FaqGroupList />
      </div>
    </main>
  );
}
