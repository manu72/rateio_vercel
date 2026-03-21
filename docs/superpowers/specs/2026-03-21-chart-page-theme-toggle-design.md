# Chart Page Theme Toggle — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Overview

Add the same dark/light mode toggle button to the chart page header that was added to the main page header. Reuses the existing `useTheme` hook and identical button styling.

## Change

**File:** `app/chart/[base]/[target]/page.tsx` (already `'use client'`)

1. **Import:** Add `import { useTheme } from '@/components/ThemeProvider'`

2. **Hook call:** Add `const { theme, toggleTheme } = useTheme()` at the top of `ChartPage`, alongside the existing `useParams`, `useRouter`, and `useState` calls — before the `getCurrency` calls and before any early returns. React's Rules of Hooks require hooks to be called unconditionally at the top of the component.

3. **Toggle button:** Add the button to the right of the rate display `<span>` in the main return's header flex row (lines ~67-69). Identical to `Header.tsx`: `type="button"`, `onClick={toggleTheme}`, `aria-label="Toggle theme"`, `suppressHydrationWarning`, same rounded-xl border Tailwind classes, `SunIcon` when dark, `MoonIcon` when light.

4. **SVG icons:** Copy the `SunIcon` and `MoonIcon` private functions inline into the chart page file. No shared icons file needed (YAGNI — two callers don't justify extraction).

5. **Early-return error path** (invalid currency pair, lines 32–46): No toggle needed. This is a bare error screen with only a back button. The toggle is omitted there deliberately.

## Out of Scope

- Changes to `ThemeProvider`, `layout.tsx`, or any other file
- Extracting icons to a shared component
