import { Package, Sparkles, Truck, Wallet } from "lucide-react";

// One sentence per shelf, shared by the FAQ entry below and each
// /collections/<category> page header — so the two can't drift apart.
export const FRAGRANCE_CATEGORY_BLURBS = {
  NICHE:
    "small independent perfume houses. Smaller batches, more unusual compositions, and usually a higher price per ml.",
  DESIGNER:
    "fragrances from fashion and beauty labels like Dior, YSL, or Versace. Widely recognised, easy to wear, and the most familiar names on the shelf.",
  MIDDLE_EASTERN:
    "houses from the Gulf, such as Lattafa, Armaf, and Rasasi. Known for rich oud, amber, and spice, strong lasting power, and very fair prices.",
} as const;

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
            "Full bottle — a complete bottle, either retail packaging or a tester. Most are brand new (BNIB); a few are opened but still complete, at a lower price.",
            "Partial — an opened bottle with a few sprays already used, at a lower price.",
            "Decant — a small pour from a bottle, so you can try a scent without buying the whole thing.",
          ],
        } satisfies FaqAnswer,
      },
      {
        q: "What do BNIB, FP, and BO mean on a full bottle or partial?",
        a: {
          lead: "They describe the exact same thing every listing shows above its size — how new it is, and whether the box comes with it:",
          bullets: [
            "BNIB — Brand New In Box: unopened, comes with everything it shipped with.",
            "FP — Full Package: not brand new, but still comes with the box.",
            "BO — Bottle Only: just the bottle, no box.",
          ],
          note: "A partial is opened by definition, so it never shows BNIB — only FP or BO.",
        } satisfies FaqAnswer,
      },
      {
        q: "What's the difference between Retail and In-house on a decant?",
        a: {
          lead: "Both are decants — the difference is who bottled them:",
          bullets: [
            "In-house — we poured it ourselves, to order, from a full bottle we own. Available as long as that bottle has enough left.",
            "Retail — bottled by the perfume house itself and sourced directly from them, not poured by us. It arrives sealed as its own unit, so it has its own stock and can sell out.",
          ],
          note: "If both exist at the same size, you'll see two buttons to pick from — e.g. 10ML · Retail and a plain 10ML for the in-house pour (In-house is the default, so it's the one left unlabeled).",
        } satisfies FaqAnswer,
      },
      {
        q: "What do Niche, Designer, and Middle Eastern mean?",
        a: {
          lead: "They're the three shelves we sort the catalog into, by the kind of house a fragrance comes from:",
          bullets: [
            `Niche — ${FRAGRANCE_CATEGORY_BLURBS.NICHE}`,
            `Designer — ${FRAGRANCE_CATEGORY_BLURBS.DESIGNER}`,
            `Middle Eastern — ${FRAGRANCE_CATEGORY_BLURBS.MIDDLE_EASTERN}`,
          ],
          note: "It's about the house, not the scent itself — you'll find fresh, sweet, and woody fragrances on all three shelves.",
        } satisfies FaqAnswer,
      },
      {
        q: "Can I buy a tester bottle?",
        a: "Yes — testers are listed in the shop like any other bottle, just look for the size marked Tester. You can also earn one free: spend ₱2,000 or more on decants (after discounts) in a delivered order and we'll include a complimentary tester.",
      },
      {
        q: "Do I need an account to order?",
        a: "You can browse and add to cart as a guest. To check out, submit a payment receipt, or view your order history, you'll need an account — sign in anytime and your cart carries over. Buy Now skips the cart and checks out just that one item.",
      },
      {
        q: "How do I know what's happening with my order?",
        a: {
          lead: "Every order moves through the same stages, visible anytime under Account → Orders:",
          bullets: [
            "Delivery — Awaiting payment → Receipt submitted → Confirmed → Shipped → Delivered → Completed.",
            "Pickup — Awaiting payment → Receipt submitted → Confirmed → Ready for pickup → Completed.",
          ],
          note: "We also email you at each step.",
        } satisfies FaqAnswer,
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
            "Upload your receipt on the order's payment page within 24 hours of placing the order.",
            "We verify it by hand — stock is reserved only once we do.",
          ],
          note: "An order with no receipt after 24 hours is cancelled automatically, and we'll usually send a reminder email before then. Changed your mind? Cancel it yourself from Account → Orders.",
        } satisfies FaqAnswer,
      },
      {
        q: "Can I change or cancel my order?",
        a: {
          lead: "Cancelling is done from Account → Orders:",
          bullets: [
            "Before your payment is verified — cancel it yourself, instantly.",
            "After it's confirmed — request a cancellation with a reason, and we'll review it.",
            "Once it has shipped or is ready for pickup, it can't be cancelled from your account.",
          ],
          note: "Want to change something instead of cancelling? Message us on Messenger or Instagram, or email us — everything is on the Contact page.",
        } satisfies FaqAnswer,
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
          lead: "Spend ₱2,000 or more on decants (counted after discounts) in one delivered order, and you get:",
          bullets: [
            "Free delivery",
            "One complimentary tester, matched to a brand in your order",
          ],
          note: "Testers are also sold on their own in the shop — this promo is a bonus, not the only way to get one. Pickup is already free but doesn't include the tester, and we'll follow up if no matching tester is in stock.",
        } satisfies FaqAnswer,
      },
      {
        q: "How do promo codes work?",
        a: {
          lead: "At checkout you can use one order code and one delivery code together:",
          bullets: [
            "Order code — takes money off items that aren't already on sale.",
            "Delivery code — takes money off the delivery fee, so it has nothing to discount on pickup or once delivery is already free.",
          ],
          note: "A code can also have a minimum spend (counted after your other discounts), start and end dates, or be limited to a first order or one use per customer. Codes you can use, including any made just for you, are under Account → Promo codes. To get new codes by email, turn on \"Send me news and promotions\" under Account → Notifications.",
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
