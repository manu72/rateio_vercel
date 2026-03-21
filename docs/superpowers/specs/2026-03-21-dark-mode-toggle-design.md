# Dark Mode Toggle — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Overview

Add a dark/light mode toggle button to the Rateio app header. Default behaviour follows the device OS preference. User preference persists in `localStorage`. Flash of wrong theme is prevented via an inline script that runs before paint.

## Requirements

- Toggle button placed in the header, to the right of the "Updated..." timestamp
- Default: follows OS `prefers-color-scheme`
- User preference persists in `localStorage` under key `'theme'`
- No flash of wrong theme on page load
- Sun icon in light mode, moon icon in dark mode (rounded square style matching screenshot)

## Architecture

### 1. Tailwind v4 Dark Mode Strategy

In `app/globals.css`:

1. **Remove** the existing `@media (prefers-color-scheme: dark)` block (lines 15–20). This block sets CSS custom properties at the `:root` level and will continue to apply regardless of the class on `<html>`, undermining the user's stored preference if left in place.

2. **Add** the following to switch Tailwind's `dark:` variant to class-based strategy:

```css
@variant dark (&:where(.dark, .dark *));
```

This makes all existing `dark:` classes respond to `class="dark"` on `<html>`. The `:where(.dark, .dark *)` selector matches both elements that are `.dark` themselves (e.g. `<html>`) and their descendants, which is the correct coverage. The zero-specificity of `:where()` is intentional — it avoids winning accidental specificity battles, consistent with how Tailwind v4 uses `:where()` elsewhere.

3. **Clean up the `@theme inline` block** in `globals.css`. Remove the `--color-background` and `--color-foreground` entries from `@theme inline`. These entries are only meaningful while `--background`/`--foreground` are dark-mode-aware custom properties. After the `@media` block is removed, they become static light-only values. No component uses the corresponding `bg-background` or `text-foreground` Tailwind utilities, so removing them is safe.

4. **Remove or simplify the `body` rule** in `globals.css`. After removing the `@media` block, the `--background` and `--foreground` custom properties will always resolve to their light-mode values. The `body { background: var(--background); color: var(--foreground) }` rule would therefore always apply light colours, overriding the `dark:bg-slate-950` Tailwind class on `<body>`. Since the codebase already uses Tailwind `dark:bg-*` and `dark:text-*` classes throughout, the `var(--background)`/`var(--foreground)` references in the `body` rule should be removed. The `body` rule can be left with only `font-family` if no other CSS variables are used.

### 2. FOUC Prevention — Inline Script

In `app/layout.tsx`, add a `<script dangerouslySetInnerHTML>` inside `<head>` that runs synchronously before the browser paints any CSS. The entire script must be wrapped in `try/catch` to silently handle `localStorage` being unavailable (e.g. third-party iframes, certain private-browsing configurations — same pattern as the existing `storage.ts`):

```js
try {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
} catch {}
```

This ensures the correct class is on `<html>` before React hydrates, eliminating any theme flash.

### 3. `<html>` hydration warning suppression

Add `suppressHydrationWarning` to the `<html>` element in `layout.tsx`. The server renders `<html>` without the `dark` class (it has no access to localStorage), but the inline script may add it before React hydrates. This attribute tells React to ignore the class mismatch on `<html>` without throwing a hydration warning.

### 4. ThemeProvider (`components/ThemeProvider.tsx`)

A `'use client'` context provider that accepts and renders `children` as a React node prop (passed through from the server layout without wrapping in any client-only logic — the standard App Router children-as-slot pattern).

- **Initial state**: reads `document.documentElement.classList.contains('dark')` on the client. On the server this value is unavailable, so the component must initialise with a safe default (e.g. `false`) and correct itself after mount via `useEffect`. The toggle icon should also use `suppressHydrationWarning` to avoid a mismatch between the server-rendered icon and the client's first render. **Accepted trade-off**: on the first client render (before `useEffect` fires), the toggle icon will briefly show its light-mode state even for dark-mode users, then correct. This narrow icon flicker is acceptable for this app.
- **`toggleTheme()`**:
  1. Flip the `dark` class on `document.documentElement`
  2. Call `window.matchMedia('(prefers-color-scheme: dark)').matches` at the moment of toggle to get the live OS preference
  3. If the new theme matches the OS preference → remove `'theme'` from `localStorage` (so future OS changes apply naturally)
  4. Otherwise → save `'light'` or `'dark'` to `localStorage`
  5. Wrap localStorage access in `try/catch` (fail silently)

**Known limitation**: if the OS preference changes after page load and the user has no stored preference, the displayed theme will not update until the next page load. This is acceptable behaviour and mirrors how most dark mode toggles work.

Wraps the app in `layout.tsx`. The final `<body>` structure is:
```jsx
<body ...>
  <ThemeProvider>
    {children}
    <Analytics />
  </ThemeProvider>
</body>
```
`<Analytics />` stays inside `ThemeProvider` (it is a client component and is fine as a child).

### 5. `useTheme` Hook

Exported from `ThemeProvider.tsx`. Returns `{ theme: 'light' | 'dark', toggleTheme: () => void }`.

### 6. ThemeToggle Button

Rendered inside `Header.tsx`. `Header` becomes `'use client'` to call `useTheme()`.

- **Icon**: SVG sun when `theme === 'light'`, SVG moon when `theme === 'dark'`
- **Style**: rounded square with subtle border, matching the provided screenshot reference
- **Placement**: flex row after the "Updated..." `<span>`
- The toggle button element should use `suppressHydrationWarning` to avoid a hydration mismatch on the icon, since the server does not know the user's theme.

**Note on `formatRelative`**: moving `Header` to `'use client'` means `formatRelative` (which calls `Date.now()`) will now run on the client rather than the server. This is intentional and correct — the timestamp label will reflect the user's local clock and can update live if needed in the future. The `updatedAt` prop passed from `page.tsx` continues to work unchanged.

## File Changes

| File | Change |
|------|--------|
| `app/globals.css` | Remove `@media (prefers-color-scheme: dark)` block; remove `--color-background`/`--color-foreground` from `@theme inline`; remove `var(--background)`/`var(--foreground)` from `body` rule; add `@variant dark (&:where(.dark, .dark *))` |
| `app/layout.tsx` | Add `suppressHydrationWarning` to `<html>`; add inline script in `<head>`; wrap `children` with `<ThemeProvider>` |
| `components/ThemeProvider.tsx` | New file — context, provider, `useTheme` hook |
| `components/Header.tsx` | Add `'use client'`; render `ThemeToggle` button using `useTheme()`; add `suppressHydrationWarning` to toggle button |

## Out of Scope

- Theming the chart page header (can be done in a follow-up using the same `useTheme` hook)
- System tray / OS-level integration beyond `prefers-color-scheme`
- Live OS preference change detection after page load
