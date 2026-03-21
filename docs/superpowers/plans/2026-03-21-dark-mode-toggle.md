# Dark Mode Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dark/light mode toggle button to the Rateio header that defaults to OS preference, persists user choice to localStorage, and never flashes the wrong theme on load.

**Architecture:** Tailwind v4 is switched from media-query to class-based dark mode via `@variant dark`. An inline `<script>` in `<head>` applies the correct `dark` class to `<html>` before paint. A `ThemeProvider` React context holds the toggle state client-side and syncs it to localStorage.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, React context, localStorage, Jest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `app/globals.css` | Modify | Switch dark mode to class strategy; clean up obsolete CSS variables |
| `app/layout.tsx` | Modify | Add FOUC-prevention inline script; add `suppressHydrationWarning` to `<html>`; wrap body with `ThemeProvider` |
| `components/ThemeProvider.tsx` | Create | React context + provider + `useTheme` hook |
| `components/Header.tsx` | Modify | Add `'use client'`; add ThemeToggle button using `useTheme()` |
| `__tests__/components/ThemeProvider.test.tsx` | Create | Unit tests for `useTheme` hook |
| `__tests__/components/Header.test.tsx` | Create | Unit test for toggle button render |

---

## Task 1: Update `globals.css` — switch to class-based dark mode

**Files:**
- Modify: `app/globals.css`

The current file uses `@media (prefers-color-scheme: dark)` to drive dark mode at the CSS variable level, plus Tailwind's default media-query dark variant. We're replacing this entirely with a class-based strategy. This is a pure CSS change — no tests required.

Current `globals.css` for reference:
```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 1: Replace `globals.css` with the updated version**

Replace the entire file with:

```css
@import "tailwindcss";

@variant dark (&:where(.dark, .dark *));

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  font-family: Arial, Helvetica, sans-serif;
}
```

**What changed and why:**
- Added `@variant dark (&:where(.dark, .dark *))` — tells Tailwind v4 to use the `dark` class on `<html>` instead of `@media (prefers-color-scheme: dark)`. All existing `dark:` classes throughout the codebase now respond to `html.dark`.
- Removed `@media (prefers-color-scheme: dark)` block — this was setting `--background`/`--foreground` CSS variables at `:root` level. If left in, it would override the user's stored preference by re-applying OS-driven colours regardless of the `dark` class.
- Removed `--color-background` and `--color-foreground` from `@theme inline` — these were only useful while the custom properties were dark-mode-aware. No component uses `bg-background` or `text-foreground` Tailwind utilities, so they're dead tokens.
- Removed `background: var(--background)` and `color: var(--foreground)` from `body` — without the `@media` block, these properties would always resolve to light-mode values, overriding the `dark:bg-slate-950` class already on `<body>` in `layout.tsx`.
- The `:root { --background; --foreground }` block is intentionally retained — it's now dead code (nothing references those variables) but harmless. Removing it is also fine if you prefer a clean file.

- [ ] **Step 2: Start the dev server and visually verify dark mode still works**

```bash
npm run dev
```

Open `http://localhost:3000` in a browser. Toggle your OS to dark mode — the app should appear dark. Toggle back to light — the app should appear light. (This confirms the `@variant` line is wired up before we add the toggle button in later tasks.)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "refactor: switch Tailwind dark mode to class strategy"
```

---

## Task 2: Create `ThemeProvider` with `useTheme` hook

**Files:**
- Create: `components/ThemeProvider.tsx`
- Create: `__tests__/components/ThemeProvider.test.tsx`

This is the core logic: React context that reads/writes the `dark` class on `<html>` and syncs to localStorage.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/ThemeProvider.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '@/components/ThemeProvider'

// Helper component that renders theme state and a toggle button
function TestConsumer() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <ThemeProvider>
      <TestConsumer />
    </ThemeProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('ThemeProvider', () => {
  it('reads initial theme from html class (dark)', () => {
    document.documentElement.classList.add('dark')
    renderWithProvider()
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('reads initial theme from html class (light)', () => {
    renderWithProvider()
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
  })

  it('toggles from light to dark', async () => {
    renderWithProvider()
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggles from dark to light', async () => {
    document.documentElement.classList.add('dark')
    renderWithProvider()
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('persists dark preference to localStorage when it differs from OS', async () => {
    // jsdom matchMedia returns false (light) by default
    renderWithProvider()
    await userEvent.click(screen.getByRole('button')) // toggle to dark
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('clears localStorage when new theme matches OS preference', async () => {
    // OS is light (jsdom default); start in dark, toggle to light → matches OS → clear
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
    renderWithProvider()
    await userEvent.click(screen.getByRole('button')) // toggle to light
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('does not throw when localStorage is unavailable', async () => {
    // localStorage.setItem/removeItem throw in some private browsing contexts.
    // We verify the toggle still completes by asserting the DOM class changed —
    // the DOM manipulation happens before the localStorage call, so if the try/catch
    // is missing, the error would escape into React's event system and fail the test.
    // Using jest.spyOn avoids descriptor issues and Jest auto-restores after the test.
    jest.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('unavailable') })
    jest.spyOn(localStorage, 'removeItem').mockImplementation(() => { throw new Error('unavailable') })
    renderWithProvider()
    await userEvent.click(screen.getByRole('button'))
    // DOM class changed → toggleTheme ran to completion without the error escaping
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('throws if useTheme is called outside ThemeProvider', () => {
    // Suppress the console.error React logs for this expected throw
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useTheme must be used within ThemeProvider')
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern="ThemeProvider" --no-coverage
```

Expected: all tests fail with `Cannot find module '@/components/ThemeProvider'`

- [ ] **Step 3: Implement `ThemeProvider.tsx`**

Create `components/ThemeProvider.tsx`:

```tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with false (light) — the correct value is set by useEffect after mount.
  // The inline script in layout.tsx has already applied the correct class to <html>
  // before paint, so there is no visual flash. The icon may briefly show the wrong
  // state on the very first render (before useEffect fires) — this is an accepted
  // trade-off documented in the spec.
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleTheme() {
    const nextDark = !isDark
    setIsDark(nextDark)

    if (nextDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    const osPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const nextTheme: Theme = nextDark ? 'dark' : 'light'
    const osTheme: Theme = osPrefersDark ? 'dark' : 'light'

    try {
      if (nextTheme === osTheme) {
        // New preference matches OS — remove override so future OS changes apply
        localStorage.removeItem('theme')
      } else {
        localStorage.setItem('theme', nextTheme)
      }
    } catch {
      // localStorage unavailable — fail silently
    }
  }

  return (
    <ThemeContext.Provider value={{ theme: isDark ? 'dark' : 'light', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern="ThemeProvider" --no-coverage
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/ThemeProvider.tsx __tests__/components/ThemeProvider.test.tsx
git commit -m "feat: add ThemeProvider context and useTheme hook"
```

---

## Task 3: Update `layout.tsx` — FOUC prevention + ThemeProvider wrapper

**Files:**
- Modify: `app/layout.tsx`

Add the inline script that prevents theme flash, `suppressHydrationWarning` on `<html>`, and wrap the body contents with `ThemeProvider`. This is a structural change to a server component — no unit tests cover it (it's tested by manual browser verification and E2E).

Current `layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = { ... };

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

- [ ] **Step 1: Update `layout.tsx`**

Replace the entire file. The `metadata` export content is **unchanged** — it is shown in full below only so you have a complete replacement target with no ambiguity.

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/ThemeProvider";
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} bg-slate-100 dark:bg-slate-950 min-h-screen`}>
        <ThemeProvider>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Key points:**
- `suppressHydrationWarning` on `<html>` prevents React warnings when the inline script adds the `dark` class before hydration (the server renders `<html>` without it).
- The `themeScript` string is extracted to a variable to avoid JSX escaping issues with template literals.
- `<script>` goes in `<head>` so it runs before any CSS or body rendering — this is what prevents the flash.
- `ThemeProvider` wraps both `{children}` and `<Analytics />`.

- [ ] **Step 2: Verify dev server still works**

```bash
npm run dev
```

Open `http://localhost:3000`. The app should load without errors. Open DevTools → Application → Local Storage — confirm there's no `theme` key (first load). The page should match your OS dark/light mode.

- [ ] **Step 3: Test FOUC prevention manually**

In DevTools → Application → Local Storage, set `theme` to `dark`. Hard-refresh the page (Cmd+Shift+R / Ctrl+Shift+R). Even if your OS is in light mode, the page should load in dark mode with no flash. Then set `theme` to `light` and repeat — the page should stay light regardless of OS mode. Delete the key when done.

- [ ] **Step 4: Run full test suite to confirm nothing is broken**

```bash
npm test -- --no-coverage
```

Expected: all existing tests pass (ThemeProvider tests from Task 2 also pass).

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add FOUC-prevention script and ThemeProvider to layout"
```

---

## Task 4: Update `Header.tsx` — add toggle button

**Files:**
- Modify: `components/Header.tsx`
- Create: `__tests__/components/Header.test.tsx`

Add the `'use client'` directive, import `useTheme`, and render the toggle button to the right of the "Updated..." timestamp.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/Header.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from '@/components/Header'
import { ThemeProvider } from '@/components/ThemeProvider'

function renderHeader(updatedAt: string | null = null) {
  return render(
    <ThemeProvider>
      <Header updatedAt={updatedAt} />
    </ThemeProvider>
  )
}

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  localStorage.clear()
})

describe('Header', () => {
  it('renders the Rateio logo and title', () => {
    renderHeader()
    expect(screen.getByText('Rateio')).toBeInTheDocument()
  })

  it('renders "Loading rates..." when updatedAt is null', () => {
    renderHeader(null)
    expect(screen.getByText('Loading rates...')).toBeInTheDocument()
  })

  it('renders a theme toggle button', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })

  it('toggles dark class on html when button is clicked', async () => {
    renderHeader()
    const btn = screen.getByRole('button', { name: /toggle theme/i })
    await userEvent.click(btn)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await userEvent.click(btn)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern="Header" --no-coverage
```

Expected: "renders a theme toggle button" and "toggles dark class" fail (button does not exist yet).

- [ ] **Step 3: Update `Header.tsx`**

Replace the entire file with:

```tsx
'use client'

import Image from 'next/image'
import { useTheme } from '@/components/ThemeProvider'

interface HeaderProps {
  updatedAt: string | null  // ISO string or null while loading
}

export default function Header({ updatedAt }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()

  const label = updatedAt
    ? `Updated ${formatRelative(updatedAt)}`
    : 'Loading rates...'

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
      <span className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
        <Image src="/favicon-32x32.png" alt="Rateio logo" width={24} height={24} />
        Rateio
      </span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">{label}</span>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          suppressHydrationWarning
          className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </header>
  )
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function formatRelative(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return `${Math.floor(diffHrs / 24)}d ago`
}
```

**Notes:**
- `suppressHydrationWarning` is on the `<button>` (not the icons) — it prevents React from warning about the icon mismatch between server render (always light) and first client render (may be dark).
- `aria-label="Toggle theme"` makes the button accessible and lets the test find it by name.
- The icons are simple inline SVGs — no extra dependencies needed.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern="Header" --no-coverage
```

Expected: all 4 tests pass.

- [ ] **Step 5: Run the full test suite**

```bash
npm test -- --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Verify visually in the browser**

```bash
npm run dev
```

Open `http://localhost:3000`. You should see a small sun/moon icon button in the top-right of the header, to the right of the "Updated..." text. Click it — the page should switch between dark and light mode. Reload the page — the selected theme should persist.

- [ ] **Step 7: Commit**

```bash
git add components/Header.tsx __tests__/components/Header.test.tsx
git commit -m "feat: add dark/light mode toggle button to header"
```

---

## Task 5: Run E2E tests

**Files:** none

Confirm nothing is broken end-to-end.

- [ ] **Step 1: Run E2E tests**

```bash
npm run test:e2e
```

Expected: all existing E2E tests pass. (The toggle button is new and not covered by existing E2E tests — that's fine for now.)

- [ ] **Step 2: If any E2E tests fail**

Check if the failure is related to `Header` or dark mode changes. If the test is looking for a specific element that moved (e.g. the "Updated" text is now wrapped in a `<div>` with the toggle button), update the selector in the E2E test to match the new structure.
