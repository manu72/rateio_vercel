import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/ThemeProvider";
import SWRProvider from "@/components/SWRProvider";
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

const themeScript = `try {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
} catch {}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Synchronous inline script to prevent FOUC in dark mode.
            React warns that scripts in components aren't re-executed on the client —
            that's correct and intended: this only needs to run from the SSR HTML,
            before the first paint, to add the 'dark' class early enough. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} bg-slate-100 dark:bg-slate-950 min-h-screen`}>
        <ThemeProvider>
          <SWRProvider>
            {children}
            <Analytics />
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
