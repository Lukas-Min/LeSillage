import { Package, Sparkles, Truck, Wallet } from "lucide-react";

export const FAQ_GROUPS = [
  {
    id: "ordering",
    title: "Ordering",
    icon: Package,
    items: [
      {
        q: "What's the difference between a full bottle, a partial, and a decant?",
        a: "A full bottle is a complete unused bottle — retail packaging or a tester bottle, both of which you can buy. A partial is an opened bottle with some sprays already used, priced lower. A decant is a smaller fill so you can try a scent without the whole bottle. Decants are either In-house (we pour them here from a tester or partial we keep) or Retail (bought already bottled as a decant from the house). Size buttons always name both the millilitres and which of those it is — for example 10ML · In-house.",
      },
      {
        q: "What's the difference between Retail and In-house on a decant?",
        a: "In-house is poured here from a bottle we own, so availability follows the remaining millilitres on that fragrance. Retail is a pre-made decant we bought as its own unit — it has its own stock and can sell out. When both exist at the same size, you'll see two buttons, such as 10ML · Retail and 10ML · In-house. If a size has more than one condition or packaging, a second row appears so you can pick the exact bottle.",
      },
      {
        q: "Can I buy a tester bottle?",
        a: "Yes. Tester bottles are listed in the shop like any other full bottle or partial — choose the size marked Tester. Spending ₱2,000 or more on discounted decants can also add a complimentary tester on a delivered order; that's an extra, not the only way to get one.",
      },
      {
        q: "Do I need an account to order?",
        a: "You can browse the shop and build your cart as a guest, but you'll need an account to check out, submit a payment receipt, and view your order history. Your cart carries over the moment you sign in. Buy now on a listing skips the cart and checks out that one item only.",
      },
      {
        q: "How do I know what's happening with my order?",
        a: "Every order moves through clear stages — Awaiting payment → Receipt submitted → Confirmed → Shipped → Completed — visible any time under Account → Orders. We also email you at each step.",
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
        q: "I placed an order but haven't paid yet. What happens?",
        a: "Payment is the only thing left. Scan a QR, send the total, and upload the receipt from your order's payment page. Stock isn't reserved until we verify that receipt. If two hours go by and it's still waiting, we'll email you once as a nudge. You can cancel from Account → Orders if you change your mind — we'll email a confirmation.",
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
        a: "Yes, anywhere in the Philippines via trusted couriers. Each listing shows whether that item is on hand or pre-order — it isn't the same for every full bottle or every decant. On-hand items ship within 1–2 days, and Metro Manila orders placed on a Saturday or Sunday can ship same-day. Pre-order items take 3–30 days. Mixed orders show both windows.",
      },
      {
        q: "Can I pick up instead of having it delivered?",
        a: "Yes — pickup is free and by appointment. Choose Pickup at checkout and we'll coordinate a time once your payment is verified. Pickup does not include the complimentary tester; that promo is for delivered orders.",
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
        a: "On a delivered order, ₱2,000 or more in discounted decants unlocks free delivery and one complimentary tester, matched first to a fragrance family in your order, then brand. Tester bottles are also sold on their own in the shop — the promo is an extra unit, not a hold-back from the shelf. Pickup is already free and does not include the complimentary tester. If no matching tester is in stock, we'll follow up.",
      },
      {
        q: "Are your fragrances authentic?",
        a: "Yes. Every bottle we carry, in every format, is sourced from authorised distributors — we don't deal in grey-market or counterfeit stock.",
      },
    ],
  },
] as const;

export const SHOP_CATALOG_SUBTITLE =
  "Decants, partials, and full bottles from niche, designer, and Middle Eastern houses — filter to find yours.";
