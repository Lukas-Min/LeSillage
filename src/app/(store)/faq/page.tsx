import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";

const FAQ = [
  {
    q: "Do you ship nationwide?",
    a: "Yes, we ship anywhere in the Philippines via trusted couriers. Metro Manila orders placed on a Saturday or Sunday can ship same-day.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Bank transfer, GCash, Maya, and other QR-based methods. We do not run a card or e-wallet gateway — you upload a receipt screenshot after placing your order.",
  },
  {
    q: "How does the tester promo work?",
    a: "Decant orders over ₱2,000 unlock free shipping and a complimentary tester drawn from a fragrance family matching your cart.",
  },
  {
    q: "Can I change or cancel my order?",
    a: "Reach us at le.sillage.mnl@gmail.com before payment is verified. After verification, we can only cancel with a reason.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "FAQs" }]} />
      <header className="space-y-2">
        <Eyebrow>Help</Eyebrow>
        <h1 className="font-serif-display text-4xl">FAQ</h1>
      </header>
      <Card className="rounded-md">
        <CardContent className="space-y-4 p-6 text-sm">
          {FAQ.map((item) => (
            <div key={item.q} className="space-y-1 border-t border-border/60 pt-4 first:border-t-0 first:pt-0">
              <p className="font-serif-display text-lg leading-tight">{item.q}</p>
              <p className="text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
