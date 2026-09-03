import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";

const FAQ = [
  {
    q: "What's the difference between a full bottle, a partial, and a decant?",
    a: "A full bottle is sealed and unused. A partial is an opened bottle with a few sprays missing, priced to move. A decant is a smaller volume poured from a sealed tester into its own vial — the way to try a fragrance without buying the whole bottle.",
  },
  {
    q: "Do you ship nationwide?",
    a: "Yes, we ship anywhere in the Philippines via trusted couriers. On-hand items (partials and decants) ship within 1–2 days, and Metro Manila orders placed on a Saturday or Sunday can ship same-day. Full bottles are made to order and take 3–30 days.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Bank transfer, GCash, Maya, and other QR-based methods. We do not run a card or e-wallet gateway — you upload a receipt screenshot after placing your order, and we verify it manually.",
  },
  {
    q: "How does the tester promo work?",
    a: "Decant orders that total ₱2,000 or more (after any discounts) unlock free delivery and a complimentary tester drawn from a fragrance family matching your cart. Testers aren't sold separately — they're only given out as part of this promo.",
  },
  {
    q: "Are your fragrances authentic?",
    a: "Yes. Every bottle we carry, in every format, is sourced from authorised distributors — we don't deal in grey-market or counterfeit stock.",
  },
  {
    q: "Do I need an account to order?",
    a: "You can browse the shop and build your cart as a guest, but you'll need an account to check out, submit a payment receipt, and view your order history. Your cart carries over the moment you sign in.",
  },
  {
    q: "Can I pick up instead of having it delivered?",
    a: "Yes — pickup is free and by appointment. Choose Pickup at checkout and we'll coordinate a time once your payment is verified.",
  },
  {
    q: "How do I know what's happening with my order?",
    a: "Every order moves through clear stages — awaiting payment, receipt submitted, confirmed, shipped, completed — visible any time under Account → Orders. We also email you at each step.",
  },
  {
    q: "Can I change or cancel my order?",
    a: "Reach us at le.sillage.mnl@gmail.com before payment is verified — changes are easiest then. After verification, we can still cancel, but we'll ask for a reason and it may take a little longer to process.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "FAQs" }]} />
      <div className="mx-auto max-w-3xl space-y-6">
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
      </div>
    </main>
  );
}
