import { Package, Sparkles, Truck, Wallet } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, SectionCard } from "@/components/ui/section";

const FAQ_GROUPS = [
  {
    id: "ordering",
    title: "Ordering",
    icon: Package,
    items: [
      {
        q: "What's the difference between a full bottle, a partial, and a decant?",
        a: "A full bottle is sealed and unused. A partial is an opened bottle with a few sprays missing, priced to move. A decant is a smaller volume poured from a tester or a partial into its own vial — the way to try a fragrance without buying the whole bottle.",
      },
      {
        q: "Do I need an account to order?",
        a: "You can browse the shop and build your cart as a guest, but you'll need an account to check out, submit a payment receipt, and view your order history. Your cart carries over the moment you sign in.",
      },
      {
        q: "How do I know what's happening with my order?",
        a: "Every order moves through clear stages — awaiting payment, receipt submitted, confirmed, shipped, completed — visible any time under Account → Orders. We also email you at each step.",
      },
    ],
  },
  {
    id: "payment",
    title: "Payment",
    icon: Wallet,
    items: [
      {
        q: "What payment methods do you accept?",
        a: "Bank transfer, GCash, Maya, and other QR-based methods. We do not run a card or e-wallet gateway — you upload a receipt screenshot after placing your order, and we verify it manually.",
      },
      {
        q: "Can I change or cancel my order?",
        a: "Reach us at le.sillage.mnl@gmail.com before payment is verified — changes are easiest then. After verification, we can still cancel, but we'll ask for a reason and it may take a little longer to process.",
      },
    ],
  },
  {
    id: "shipping",
    title: "Shipping & pickup",
    icon: Truck,
    items: [
      {
        q: "Do you ship nationwide?",
        a: "Yes, we ship anywhere in the Philippines via trusted couriers. On-hand items (partials and decants) ship within 1–2 days, and Metro Manila orders placed on a Saturday or Sunday can ship same-day. Full bottles are made to order and take 3–30 days.",
      },
      {
        q: "Can I pick up instead of having it delivered?",
        a: "Yes — pickup is free and by appointment. Choose Pickup at checkout and we'll coordinate a time once your payment is verified.",
      },
    ],
  },
  {
    id: "promos",
    title: "Promos & authenticity",
    icon: Sparkles,
    items: [
      {
        q: "How does the tester promo work?",
        a: "Decant orders that total ₱2,000 or more (after any discounts) unlock free delivery and a complimentary tester drawn from a fragrance family matching your cart. Testers aren't sold separately — they're only given out as part of this promo.",
      },
      {
        q: "Are your fragrances authentic?",
        a: "Yes. Every bottle we carry, in every format, is sourced from authorised distributors — we don't deal in grey-market or counterfeit stock.",
      },
    ],
  },
] as const;

export default function FaqPage() {
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
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold-foreground">
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
