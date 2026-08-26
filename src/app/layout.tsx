import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { auth } from "@/auth";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import "./globals.css";
import { loadCartView, resolveActiveCart } from "@/lib/cart";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
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
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  let initialCart;
  try {
    const { cart } = await resolveActiveCart();
    initialCart = await loadCartView(cart.id);
  } catch {
    initialCart = undefined;
  }
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers initialCart={initialCart}>
          <StoreHeader signedIn={Boolean(session?.user)} isAdmin={isAdmin} />
          <div className="flex-1">{children}</div>
          <StoreFooter />
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}