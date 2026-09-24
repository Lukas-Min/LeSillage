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
    default: "Le Sillage Manila",
    template: "%s | Le Sillage Manila",
  },
  description:
    "Le Sillage Manila — a curated retail perfume shop featuring full bottles, partials, and decants from independent and iconic houses.",
  applicationName: "Le Sillage Manila",
  openGraph: {
    title: "Le Sillage Manila",
    description:
      "Full bottles, partials, and decants. Curated retail perfume from Le Sillage Manila.",
    type: "website",
    siteName: "Le Sillage Manila",
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
            {/* No page-wide width cap here — only the header/footer (their
                own components) and the PDP (shop/[skuId]/page.tsx) are
                capped at 2xl:80vw. Every other page fills the viewport as
                before. */}
            <div className="flex flex-1 flex-col">{children}</div>
          </div>
          <StoreFooter />
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  );
}