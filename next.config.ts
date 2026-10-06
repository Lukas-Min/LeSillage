import type { NextConfig } from "next";
import { OPTIMIZED_IMAGE_HOSTS } from "./src/lib/remote-images";

const SECURITY_HEADERS: Array<{ key: string; value: string }> = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const cspProduction = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://*.vercel-storage.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const cspDevelopment = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://*.vercel-storage.com ws://localhost:3030",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const csp = process.env.NODE_ENV === "production" ? cspProduction : cspDevelopment;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: OPTIMIZED_IMAGE_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname })),
    // 75 is Next's default (the logo); product photos use 80, where the WebP
    // looks the same as Fragrantica's source JPEG at a fraction of the bytes.
    qualities: [75, 80],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Content-Security-Policy", value: csp }, ...SECURITY_HEADERS],
      },
    ];
  },
};

export default nextConfig;
