import type { Metadata } from "next";
import { Fraunces, Geist, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { loadAnnouncement } from "@/lib/announcement";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

// Prices only — chosen for numeral clarity at small sizes (the shop grid's
// price ranges were clipping/wrapping with Playfair Display). Headings and
// titles keep Playfair Display; see globals.css's .font-price-display.
const fraunces = Fraunces({
  variable: "--font-price",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3030"),
  title: {
    default: "Le Sillage",
    template: "%s | Le Sillage",
  },
  description:
    "Le Sillage — a curated retail perfume shop featuring full bottles, partials, and decants from independent and iconic houses.",
  applicationName: "Le Sillage",
  openGraph: {
    title: "Le Sillage",
    description:
      "Full bottles, partials, and decants. Curated retail perfume from Le Sillage.",
    type: "website",
    siteName: "Le Sillage",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Cached (see loadAnnouncement), so reading it here does not make every
  // prerendered route dynamic.
  const announcement = await loadAnnouncement();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${playfair.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex flex-col bg-background text-foreground">
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <StoreHeader announcement={announcement.enabled ? announcement.messages : []} />
            {/* The header/footer chrome stays full-bleed (nav bar, promo
                marquee, footer band) — only the actual page content is
                capped, and only once a screen is wide enough to call
                "large": below 2xl (1536px) every page's own w-full/px-4
                already fills the viewport exactly as before. */}
            <div className="flex flex-1 flex-col 2xl:mx-auto 2xl:w-full 2xl:max-w-[80vw]">{children}</div>
          </div>
          <StoreFooter />
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  );
}