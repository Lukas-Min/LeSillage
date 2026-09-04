import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { FAQ_GROUPS } from "@/lib/faq-copy";

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
        {FAQ_GROUPS.map((group) => (
          <SectionCard
            key={group.id}
            eyebrow={group.title}
            actions={
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold">
                <group.icon className="h-4 w-4" />
              </span>
            }
          >
            <div className="space-y-4">
              {group.items.map((item, index) => (
                <div key={item.q} className={index > 0 ? "border-t border-border/60 pt-4" : ""}>
                  <p className="font-serif-display text-base leading-tight">{item.q}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </main>
  );
}
