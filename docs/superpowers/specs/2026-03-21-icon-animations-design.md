# Icon Animations & UX Polish — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Overview

Replace emoji and text characters with Lucide SVG icons throughout the app, and add meaningful hover/press animations to improve UX — with particular attention to discoverability on mobile.

## Scope

Two files are in scope:
- `components/CurrencyRow.tsx` — drag handle, chart icon, remove button
- `components/RateChart.tsx` — time range selector buttons (1D / 1W / 1M / 1Y / 5Y)

## Icon Library

Install `lucide-react`. It is tree-shakeable (imports only what's used), has first-class React support, and is the de-facto standard icon library for Next.js/Tailwind projects.

```bash
npm install lucide-react
```

Icons used:
| Element | Lucide icon | Notes |
|---|---|---|
| Drag handle | `GripVertical` | Replaces `⠿` braille emoji |
| Chart button | `TrendingUp` | Replaces `📈` emoji |
| Remove button (desktop) | `X` | Replaces `✕` text char |

Flags remain as emoji — they are country flags, not UI icons.

## Brand Green

The app's brand green (from the favicon) is `#86fcc8`. Used exclusively for the chart icon treatment. Not used elsewhere in the current scope.

## CurrencyRow Changes

### 1. Drag Handle — Large Touch Target

The current `<span>` receiving `dragHandleProps` is replaced with a wrapper `div` that encompasses the grip icon, flag, and currency code/name. This makes the entire left cluster (~180–200px on a 430px screen) the drag surface.

**Tailwind classes on the drag wrapper div:**
```
flex items-center gap-3 cursor-grab active:cursor-grabbing
touch-none select-none self-stretch
```

The grip icon (`GripVertical`, 16px, `text-slate-300 dark:text-slate-600`) sits at the left edge. The outer row `div` retains `gap-3` — the drag wrapper is one flex child of it, and an inner `gap-3` on the wrapper handles spacing between grip, flag, and code/name. The row's padding changes from `px-3 py-3` to `pr-3 pl-0 py-3` so the handle sits flush at the left edge.

No hover animation on the drag handle itself — it is a functional control, not an action button.

### 2. Chart Icon Button — Soft Green Pill

The chart button uses a soft mint background at rest to signal it is clickable at a glance, filling to full brand green on hover.

**Tailwind classes:**
```
flex items-center justify-center w-[34px] h-[34px] rounded-[9px]
cursor-pointer
bg-green-50 text-green-600
hover:bg-[#86fcc8] hover:text-slate-900
active:scale-95 active:bg-green-400
transition-all duration-150
focus-visible:ring-2 focus-visible:ring-[#86fcc8] focus-visible:ring-offset-1
dark:bg-green-950 dark:text-green-400
dark:hover:bg-[#86fcc8] dark:hover:text-slate-900
```

Icon: `TrendingUp` at `size={20}`.

### 3. Remove Button — Hover-Reveal with Red Fill

Keeps existing desktop-only opacity-0 → opacity-100 reveal on `group-hover`. Adds red fill treatment consistent with the bold-fill approach.

**Tailwind classes:**
```
hidden md:flex items-center justify-center w-[30px] h-[30px] rounded-[8px]
cursor-pointer
opacity-0 group-hover:opacity-100
text-slate-300
hover:bg-red-500 hover:text-white
active:scale-95 active:bg-red-600
transition-all duration-150
focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1
```

Icon: `X` at `size={14}`.

## RateChart Changes

### Time Range Buttons — Blue Fill on Hover

Inactive buttons currently have no hover state. Add a blue fill matching the active state, so hover previews the selected appearance.

**Additional classes on inactive buttons** (appended to existing `transition-colors`):
```
hover:bg-blue-500 hover:text-white
active:scale-95
cursor-pointer
```

Change `transition-colors` to `transition-all` to cover the scale transform.

The active button (`bg-blue-500 text-white`) also gets `active:scale-95` and `cursor-pointer`.

## Behaviour Notes

- **Mobile (touch)**: No hover states fire on touch devices — the bold-fill hover is purely a desktop enhancement. The soft green pill background on the chart icon provides the always-on affordance for mobile.
- **Swipe-to-delete**: Unaffected. The swipe gesture fires on the outer row wrapper, not the drag handle.
- **Press feedback**: All interactive elements use `active:scale-95` (chart icon uses `active:scale-95` via `transition-all`), giving tactile press feedback on both desktop and mobile.
- **Transition duration**: 150ms across all elements — fast enough to feel snappy, not so fast it's invisible.

## Dark Mode

All new classes include `dark:` variants. The chart icon's soft pill uses `dark:bg-green-950 dark:text-green-400` at rest, flipping to `dark:hover:bg-[#86fcc8] dark:hover:text-slate-900` on hover (same as light mode hover target).

## Accessibility

`focus-visible:ring` added to all new/modified icon buttons, matching the existing pattern in `Header.tsx` (theme toggle button). This ensures keyboard navigation is visually clear without affecting mouse/touch users.

## Out of Scope

- No changes to mobile swipe-to-delete flow
- No changes to `CurrencyPicker.tsx`, `Header.tsx`, or any other component
- No custom CSS / keyframe animations — all effects use Tailwind utility classes only
