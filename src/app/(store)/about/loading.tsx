import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";

// This page has no data fetch at all — its body copy is hardcoded in
// page.tsx, so this fallback just renders the exact same static content
// immediately rather than showing any skeleton for it.
export default function AboutLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <Eyebrow>Maison</Eyebrow>
          <h1 className="font-serif-display text-4xl">About Le Sillage</h1>
        </header>
        <Card className="rounded-md">
          <CardContent className="space-y-3 p-6 text-sm leading-relaxed">
            <p>
              Le Sillage curates full bottles, partials, and decants across niche, designer, and
              Middle Eastern houses. We bottle from sealed testers so we can offer decants at
              honest prices without putting sealed stock at risk.
            </p>
            <p className="text-muted-foreground">Manila-based. Delivery or pickup by appointment.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
