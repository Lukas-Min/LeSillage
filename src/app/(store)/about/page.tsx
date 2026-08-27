import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
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
    </main>
  );
}
