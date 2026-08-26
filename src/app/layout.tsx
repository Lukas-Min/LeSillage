import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { auth } from "@/auth";
import { StoreHeader } from "@/components/store/store-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
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
  const role =
    ((session?.user as { role?: string } | undefined)?.role as "ADMIN" | "CUSTOMER" | undefined) ??
    null;
  const isAdmin = role === "ADMIN";
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <StoreHeader
            signedIn={Boolean(session?.user)}
            isAdmin={isAdmin}
            role={role}
          />
          <div className="flex-1">{children}</div>
          <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Le Sillage · Manila
          </footer>
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}