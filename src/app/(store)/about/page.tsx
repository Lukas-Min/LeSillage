import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <Eyebrow>Maison</Eyebrow>
          <h1 className="font-serif-display text-4xl">About Le Sillage</h1>
        </header>
        <Card className="rounded-md">
          <CardContent className="space-y-4 p-6 text-sm leading-relaxed">
            <p>
              Le Sillage is a Manila-based fragrance shop, est. 2026, curating full bottles,
              partials, and decants across niche, designer, and Middle Eastern houses. We built it
              around a simple idea: a great fragrance shouldn&apos;t require committing to a full
              bottle sight unseen — or paying niche prices just to find out a scent isn&apos;t
              right for you.
            </p>
            <p>
              Our decants are poured from sealed testers, never from someone&apos;s used bottle —
              so you get an honest price without us putting sealed retail stock at risk to offer
              it. Every fragrance we carry, in every format, is sourced from authorised
              distributors, so what arrives is what&apos;s on the label.
            </p>
            <p>
              We&apos;re small on purpose: every order is packed by hand, every payment receipt is
              checked by a person before stock is reserved, and every question goes to a real
              inbox — not a bot.
            </p>
            <p className="text-muted-foreground">
              Manila-based. Delivery nationwide, or pickup by appointment.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
