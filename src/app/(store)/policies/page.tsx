import { Card, CardContent } from "@/components/ui/card";

export default function PoliciesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
      <h1 className="font-serif-display text-2xl">Policies</h1>
      <Card>
        <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
          <p>Orders are confirmed only after payment verification.</p>
          <p>Pre-orders take 3–30 days. On-hand items typically ship in 1–2 days, with same-day delivery available on weekends.</p>
          <p>We collect the minimum data needed to fulfill your order and notify you about it. We never sell your data.</p>
        </CardContent>
      </Card>
    </main>
  );
}