import { FlaskConical, MapPin, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, SectionCard } from "@/components/ui/section";

const PILLARS = [
  {
    icon: FlaskConical,
    title: "Poured from testers and partials",
    body: "Decants come from sealed testers or opened partials, never bottled to order from someone's personal fragrance — so pricing stays honest without touching untouched retail stock.",
  },
  {
    icon: ShieldCheck,
    title: "Authorised distributors only",
    body: "Every fragrance we carry, in every format, is sourced through authorised channels. No grey market.",
  },
  {
    icon: MapPin,
    title: "Manila-based, nationwide",
    body: "Delivery anywhere in the Philippines, or pickup by appointment for local customers.",
  },
] as const;

// This page has no data fetch at all — its body copy is hardcoded in
// page.tsx, so this fallback just renders the exact same static content
// immediately rather than showing any skeleton for it.
export default function AboutLoading() {
  return (
    <main className="surface-grid">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
        <div className="mx-auto max-w-3xl space-y-8">
          <PageHeader
            eyebrow="Maison"
            title="About Le Sillage"
            subtitle="A Manila fragrance shop, est. 2026, built around trying before you buy."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold">
                  <pillar.icon className="h-5 w-5" />
                </span>
                <p className="font-serif-display text-base leading-tight">{pillar.title}</p>
                <p className="text-xs text-muted-foreground">{pillar.body}</p>
              </div>
            ))}
          </div>

          <SectionCard eyebrow="Our story" title="Why we exist">
            <p className="text-sm leading-relaxed">
              We built Le Sillage around a simple idea: a great fragrance shouldn&apos;t require
              committing to a full bottle sight unseen — or paying niche prices just to find out a
              scent isn&apos;t right for you. Full bottles, partials, and decants across niche,
              designer, and Middle Eastern houses, all in one shelf.
            </p>
            <p className="text-sm leading-relaxed">
              We&apos;re small on purpose: every order is packed by hand, every payment receipt is
              checked by a person before stock is reserved, and every question goes to a real
              inbox — not a bot.
            </p>
          </SectionCard>

          <blockquote className="mx-auto max-w-xl text-center font-serif-display text-lg italic text-muted-foreground">
            &ldquo;A curated trail of scent, in bottles and decants.&rdquo;
          </blockquote>
        </div>
      </div>
    </main>
  );
}
