# Icon Animations & UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace emoji/text chars with Lucide SVG icons and add bold-fill hover animations + press feedback to improve UX discoverability, especially on mobile.

**Architecture:** Three targeted changes to two existing component files — `CurrencyRow.tsx` (drag handle restructure, chart icon, remove button) and `RateChart.tsx` (range buttons). No new files are created. All effects use Tailwind utility classes; no custom CSS or keyframe animations.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS v4, lucide-react (to be installed), Jest + React Testing Library

---

## File Map

| File | Change |
|---|---|
| `components/CurrencyRow.tsx` | Restructure drag handle as wide touch target; replace `📈`/`✕`/`⠿` with Lucide icons; update button classes |
| `components/RateChart.tsx` | Add hover/active classes to range selector buttons |
| `__tests__/components/CurrencyRow.test.tsx` | No changes expected — existing tests must continue to pass |

---

## Task 1: Install lucide-react and verify baseline tests pass

**Files:**
- Run: `npm install lucide-react`
- Run: `npm test`

- [ ] **Step 1: Install lucide-react**

```bash
npm install lucide-react
```

Expected: package added to `node_modules`, `package.json` and `package-lock.json` updated.

- [ ] **Step 2: Run existing tests to establish baseline**

```bash
npm test -- --testPathPattern="CurrencyRow" --verbose
```

Expected: all 9 tests in `__tests__/components/CurrencyRow.test.tsx` PASS. Note any failures — do not proceed if there are pre-existing failures.

---

## Task 2: CurrencyRow — Restructured drag handle with large touch target

**Files:**
- Modify: `components/CurrencyRow.tsx`

**What's changing:** The existing `<span {...dragHandleProps}>⠿</span>` plus the standalone flag `<span>` and currency info `<div>` are merged into a single wrapper `<div {...dragHandleProps}>`. This makes the entire left cluster the drag surface (~180–200px wide on mobile). The `GripVertical` icon from lucide-react replaces the braille char.

The outer row `div` already has `gap-3` — the wrapper becomes one flex child of it. An inner `gap-3` inside the wrapper spaces the grip icon, flag, and code/name. Row left padding changes from `px-3 py-3` to `pr-3 pl-0 py-3` so the handle is flush with the left edge.

- [ ] **Step 1: Update CurrencyRow — drag handle**

Open `components/CurrencyRow.tsx`. Make these changes:

1. Add `GripVertical` to the import at the top of the file:
```tsx
import { GripVertical } from 'lucide-react'
```

2. In the JSX, replace the three separate elements (drag `<span>`, flag `<span>`, code/name `<div>`) with a single wrapper `<div>`:

**Remove this:**
```tsx
        {/* Drag handle */}
        <span
          className="cursor-grab text-slate-300 dark:text-slate-600 select-none touch-none"
          aria-label="drag to reorder"
          {...dragHandleProps}
        >
          ⠿
        </span>

        {/* Flag */}
        <span className="text-2xl leading-none" aria-hidden="true">{flag}</span>

        {/* Code + name */}
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{code}</span>
          <span className="text-xs text-slate-400 truncate">{name}</span>
        </div>
```

**Replace with:**
```tsx
        {/* Drag handle — wraps flag + name to create a large touch target */}
        <div
          className="flex items-center gap-3 cursor-grab active:cursor-grabbing touch-none select-none self-stretch"
          aria-label="drag to reorder"
          {...dragHandleProps}
        >
          <GripVertical size={16} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
          <span className="text-2xl leading-none flex-shrink-0" aria-hidden="true">{flag}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{code}</span>
            <span className="text-xs text-slate-400 truncate">{name}</span>
          </div>
        </div>
```

3. On the **main row `div`** (the one with `data-testid="currency-row"`), change the padding from `px-3 py-3` to `pr-3 pl-0 py-3`:

**Find:**
```tsx
        className={`group flex items-center gap-3 bg-white dark:bg-slate-800 px-3 py-3 shadow-sm transition-shadow ${
```
**Change `px-3 py-3` to `pr-3 pl-0 py-3`:**
```tsx
        className={`group flex items-center gap-3 bg-white dark:bg-slate-800 pr-3 pl-0 py-3 shadow-sm transition-shadow ${
```

- [ ] **Step 2: Run tests — drag handle**

```bash
npm test -- --testPathPattern="CurrencyRow" --verbose
```

Expected: all 9 tests PASS. The test `drag handle has touch-action:none so mobile touch events reach dnd-kit` queries `getByLabelText('drag to reorder')` and checks `.toHaveClass('touch-none')` — this still passes because the wrapper `div` carries both the `aria-label` and `touch-none` class.

- [ ] **Step 3: Commit**

```bash
git add components/CurrencyRow.tsx
git commit -m "feat: replace drag handle emoji with GripVertical icon, expand touch target to full left cluster"
```

---

## Task 3: CurrencyRow — Chart icon (soft green pill) and remove button (red fill)

**Files:**
- Modify: `components/CurrencyRow.tsx`

**What's changing:**
- Chart button: `📈` emoji → `TrendingUp` icon. Soft mint background at rest (`bg-green-50 text-green-600`), fills to brand green `#86fcc8` on hover. 34×34px button, 20px icon.
- Remove button: `✕` text char → `X` icon. Red fill on hover. 30×30px button, 14px icon.

- [ ] **Step 1: Update chart icon button**

Add `TrendingUp` to the lucide import (already has `GripVertical`):
```tsx
import { GripVertical, TrendingUp } from 'lucide-react'
```

Replace the chart button JSX:

**Remove:**
```tsx
        {/* Chart icon */}
        {showChartIcon && (
          <button
            onClick={onChartClick}
            aria-label="chart"
            className="text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 transition-colors"
          >
            📈
          </button>
        )}
```

**Replace with:**
```tsx
        {/* Chart icon */}
        {showChartIcon && (
          <button
            onClick={onChartClick}
            aria-label="chart"
            className="flex items-center justify-center w-[34px] h-[34px] rounded-[9px] cursor-pointer bg-green-50 text-green-600 hover:bg-[#86fcc8] hover:text-slate-900 active:scale-95 active:bg-green-400 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#86fcc8] focus-visible:ring-offset-1 dark:bg-green-950 dark:text-green-400 dark:hover:bg-[#86fcc8] dark:hover:text-slate-900"
          >
            <TrendingUp size={20} />
          </button>
        )}
```

- [ ] **Step 2: Update remove button**

Add `X` to the lucide import:
```tsx
import { GripVertical, TrendingUp, X } from 'lucide-react'
```

Replace the remove button JSX:

**Remove:**
```tsx
        {/* Remove button — hover-reveal on desktop */}
        <button
          onClick={onRemove}
          aria-label="remove currency"
          className="hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-center text-slate-300 hover:text-red-500 transition-opacity text-base leading-none"
        >
          ✕
        </button>
```

**Replace with:**
```tsx
        {/* Remove button — hover-reveal on desktop */}
        <button
          onClick={onRemove}
          aria-label="remove currency"
          className="hidden md:flex items-center justify-center w-[30px] h-[30px] rounded-[8px] cursor-pointer opacity-0 group-hover:opacity-100 text-slate-300 hover:bg-red-500 hover:text-white active:scale-95 active:bg-red-600 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
        >
          <X size={14} />
        </button>
```

- [ ] **Step 3: Run tests**

```bash
npm test -- --testPathPattern="CurrencyRow" --verbose
```

Expected: all 9 tests PASS. The chart button test queries by `aria-label="chart"` and the remove button test queries by `aria-label="remove currency"` — both aria-labels are preserved.

- [ ] **Step 4: Commit**

```bash
git add components/CurrencyRow.tsx
git commit -m "feat: replace chart and remove emoji/chars with Lucide icons, add bold-fill hover animations"
```

---

## Task 4: RateChart — Blue fill hover on range selector buttons

**Files:**
- Modify: `components/RateChart.tsx`

**What's changing:** The inactive range buttons (`1D`, `1W`, `1M`, `1Y`, `5Y`) currently have no hover state and `transition-colors`. Add `hover:bg-blue-500 hover:text-white`, `active:scale-95`, `cursor-pointer` and change `transition-colors` → `transition-all` for both active and inactive branches. The active button also gets `active:scale-95` and `cursor-pointer`.

- [ ] **Step 1: Update range button classes in RateChart**

Open `components/RateChart.tsx`. Find the range button className (inside the `RANGES.map` call, around line 95):

**Find:**
```tsx
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              range === r
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm'
            }`}
```

**Replace with:**
```tsx
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all duration-150 active:scale-95 ${
              range === r
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm hover:bg-blue-500 hover:text-white'
            }`}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests PASS. RateChart has no unit tests — we're verifying nothing else was broken.

- [ ] **Step 3: Commit**

```bash
git add components/RateChart.tsx
git commit -m "feat: add blue fill hover and press feedback to range selector buttons"
```

---

## Task 5: Manual smoke test

These are visual/interactive changes that cannot be verified by unit tests. Verify manually in the browser.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:3000`.

- [ ] **Step 2: CurrencyRow — drag handle**
  - On desktop: hover over the left cluster (grip + flag + currency name) — cursor should change to `grab`
  - On mobile (or DevTools device simulation): try dragging a row — the entire left section should initiate drag
  - The grip dots (GripVertical icon) should be visible and subtle (slate-300)

- [ ] **Step 3: CurrencyRow — chart icon**
  - Each row should show a small rounded green-tinted box with a trend-up arrow
  - Hover it: background fills to brand green (`#86fcc8`) with dark icon
  - Click it: should navigate to the chart page
  - Check dark mode (toggle via header button): soft pill should use dark green background

- [ ] **Step 4: CurrencyRow — remove button (desktop)**
  - Hover a currency row: `✕` should appear at the right (now as an X icon)
  - Hover the X icon itself: red fill should appear
  - Click it: currency should be removed

- [ ] **Step 5: RateChart — range buttons**
  - Navigate to a chart page (click the green chart icon on any row)
  - Hover an inactive range button (e.g. `1D` when `1M` is active): should fill blue
  - Click: active state should persist on the clicked button
  - Check press feedback: all buttons should visually depress on click (`scale-95`)
