# Vercel Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mount the Vercel Analytics component in the root layout so page views and visitor data are tracked via Vercel's dashboard.

**Architecture:** A single `<Analytics />` component from `@vercel/analytics/next` is added to `app/layout.tsx`. Being in the root layout means it is present on every page and handles client-side route changes automatically.

**Tech Stack:** Next.js 16 (App Router), `@vercel/analytics` (already installed)

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `app/layout.tsx` | Add import + `<Analytics />` in `<body>` |

---

### Task 1: Add Analytics to Root Layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add the import**

  Open `app/layout.tsx` and add the following import after the existing imports:

  ```tsx
  import { Analytics } from "@vercel/analytics/next";
  ```

- [ ] **Step 2: Mount the component**

  Inside the `<body>` element, add `<Analytics />` after `{children}`:

  ```tsx
  <body className={`${inter.className} bg-slate-100 dark:bg-slate-950 min-h-screen`}>
    {children}
    <Analytics />
  </body>
  ```

  The full updated file should look like:

  ```tsx
  import type { Metadata } from "next";
  import { Inter } from "next/font/google";
  import { Analytics } from "@vercel/analytics/next";
  import "./globals.css";

  const inter = Inter({ subsets: ["latin"] });

  export const metadata: Metadata = {
    title: "Rateio Currency Converter",
    description: "Live currency conversion with historical charts",
    icons: {
      icon: [
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
  };

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body className={`${inter.className} bg-slate-100 dark:bg-slate-950 min-h-screen`}>
          {children}
          <Analytics />
        </body>
      </html>
    );
  }
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  Run: `npm run build`
  Expected: Build completes with no TypeScript errors.

- [ ] **Step 4: Run existing unit tests**

  Run: `npm test`
  Expected: All tests pass (no regressions).

- [ ] **Step 5: Manual smoke test**

  Run: `npm run dev`

  Open `http://localhost:3000` in a browser, open DevTools → Network tab, filter by `Fetch/XHR`.
  Expected: A request to `/_vercel/insights/view` appears on page load.

  > Note: In local dev the script may be a no-op stub. The full tracking only fires on Vercel-hosted deployments. If the request doesn't appear locally, that's expected — confirm after deploying.

- [ ] **Step 6: Commit**

  ```bash
  git add app/layout.tsx
  git commit -m "add vercel analytics"
  ```
