import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="flex flex-col bg-background text-foreground">
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <StoreHeader />
            <div className="flex flex-1 flex-col">{children}</div>
          </div>
          <StoreFooter />
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  );
}