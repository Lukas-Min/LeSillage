import { Package, Sparkles, Truck, Wallet } from "lucide-react";

export type FaqAnswer =
  | string
  | {
      lead?: string;
      bullets: readonly string[];
      note?: string;
    };

export const FAQ_GROUPS = [
  {
    id: "ordering",
    title: "Ordering",
    icon: Package,
    items: [
      {
        q: "What's the difference between a full bottle, a partial, and a decant?",
        a: {
          lead: "Three ways to buy a fragrance:",
          bullets: [
            "Full bottle — a complete, unused bottle, either retail packaging or a tester.",
            "Partial — an opened bottle with a few sprays already used, at a lower price.",
            "Decant — a small pour from a bottle, so you can try a scent without buying the whole thing.",
          ],
        } satisfies FaqAnswer,
      },
      {
        q: "What's the difference between Retail and In-house on a decant?",
        a: {
          lead: "Both are decants — just sourced two different ways:",
          bullets: [
            "In-house — poured to order from a bottle we own. Stays available as long as that bottle has enough left.",
            "Retail — a pre-made decant we bought as its own unit, with its own stock. Can sell out on its own.",
          ],
          note: "If both exist at the same size, you'll see two buttons to pick from — e.g. 10ML · Retail and 10ML · In-house.",
        } satisfies FaqAnswer,
      },
      {
        q: "Can I buy a tester bottle?",
        a: "Yes — testers are listed in the shop like any other bottle, just look for the size marked Tester. You can also earn one free: spend ₱2,000 or more on discounted decants in a delivered order and we'll include a complimentary tester.",
      },
      {
        q: "Do I need an account to order?",
        a: "You can browse and add to cart as a guest. To check out, submit a payment receipt, or view your order history, you'll need an account — sign in anytime and your cart carries over. Buy Now skips the cart and checks out just that one item.",
      },
      {
        q: "How do I know what's happening with my order?",
        a: "Every order moves through the same stages — Awaiting payment → Receipt submitted → Confirmed → Shipped → Completed — visible anytime under Account → Orders. We also email you at each step.",
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
        a: "Bank transfer, GCash, Maya, or another QR wallet. We don't run a card gateway — after you order, you upload a screenshot of your receipt and we verify it by hand.",
      },
      {
        q: "I placed an order but haven't paid yet. What happens?",
        a: {
          lead: "Payment is the only thing left:",
          bullets: [
            "Scan the QR code and send the total.",
            "Upload your receipt on the order's payment page.",
            "We verify it by hand — stock is reserved only once we do.",
          ],
          note: "Still unpaid after two hours? We'll send one reminder email. Changed your mind? Cancel anytime from Account → Orders.",
        } satisfies FaqAnswer,
      },
      {
        q: "Can I change or cancel my order?",
        a: "Email le.sillage.mnl@gmail.com before your payment is verified and we can adjust or cancel it easily. After verification, cancellation is still possible — we'll just ask for a reason first, and it may take a little longer.",
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
        a: {
          lead: "Yes, anywhere in the Philippines. How fast depends on stock:",
          bullets: [
            "On hand — ships in 1–2 days (same-day in Metro Manila on weekends).",
            "Pre-order — ships in 3–30 days.",
          ],
          note: "Ordering both? You'll see each item's own window at checkout.",
        } satisfies FaqAnswer,
      },
      {
        q: "Can I pick up instead of having it delivered?",
        a: "Yes — pickup is free and by appointment. Choose Pickup at checkout and we'll set a time once your payment is verified. Note: the free tester promo is for delivered orders only.",
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
        a: {
          lead: "Spend ₱2,000 or more on discounted decants in one delivered order, and you get:",
          bullets: [
            "Free delivery",
            "One complimentary tester, matched to your order's scent family (or brand, if no exact match)",
          ],
          note: "Testers are also sold on their own in the shop — this promo is a bonus, not the only way to get one. Pickup is already free but doesn't include the tester, and we'll follow up if no matching tester is in stock.",
        } satisfies FaqAnswer,
      },
      {
        q: "Are your fragrances authentic?",
        a: "Yes. Every bottle we carry, in every format, comes from authorised distributors — never grey-market or counterfeit stock.",
      },
    ],
  },
] as const;

export const SHOP_CATALOG_SUBTITLE =
  "Decants, partials, and full bottles from niche, designer, and Middle Eastern houses — filter to find yours.";
