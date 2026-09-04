import { FlaskConical, MapPin, ShieldCheck } from "lucide-react";

export const ABOUT_PILLARS = [
  {
    icon: FlaskConical,
    title: "In-house pours and retail decants",
    body: "In-house decants are poured here from testers and partials we keep. Retail decants arrive already bottled from the house. Tester bottles are sold on the shelf too — not only given as a promo extra.",
  },
  {
    icon: ShieldCheck,
    title: "Authorised distributors only",
    body: "Every fragrance we carry, in every format, is sourced through authorised channels. No grey market.",
  },
  {
    icon: MapPin,
    title: "Manila-based, nationwide",
    body: "Delivery anywhere in the Philippines, or pickup by appointment for local customers.",
  },
] as const;
