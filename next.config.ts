import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy.
//
// script-src uses 'unsafe-inline' because Next.js App Router injects inline
// <script> tags for the RSC flight payload — a nonce-less strict policy would
// block them and break hydration. The app has no user-controlled HTML sinks,
// so the inline-script XSS surface is negligible. The next hardening step is
// to generate a per-request nonce in middleware (set x-nonce, read it in the
// root layout via next/headers, pass it to the theme <Script>), which lets us
// drop 'unsafe-inline' while keeping the FOUC script and flight payload intact.
const csp = [
  "default-src 'self'",
  // React's development build uses eval() for stack-trace reconstruction, so
  // allow 'unsafe-eval' only outside production. Production React never evals,
  // keeping the production policy strict.
  isProd
    ? "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://va.vercel-scripts.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // frame-ancestors 'none' (CSP) covers modern browsers; X-Frame-Options
  // covers legacy ones.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // HSTS only in production — avoid pinning HTTPS on localhost during dev.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
