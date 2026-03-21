# Chart Page Target Currency Picker — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Overview

Make the target currency in the chart page header clickable. Clicking it opens the existing `CurrencyPicker` modal so the user can switch the target currency without leaving the chart page.

## Requirements

- Target currency (code + flag) in the chart header is a clickable `<button>`
- Button has hover styling (text turns blue) and `hover:animate-pulse` animation
- Clicking the button opens `CurrencyPicker`
- `CurrencyPicker` is passed `selected={[base]}` so the base currency is disabled (prevents self-comparison)
- On currency selection, navigate to `/chart/${base}/${newCode}` via `router.push`
- Picker closes via `onClose` callback
- Base currency and its flag remain static (not interactive)

## Change

**File:** `app/chart/[base]/[target]/page.tsx` only.

### Header center section restructure

Current:
```tsx
<div className="flex items-center gap-2 flex-1 min-w-0">
  <span className="text-lg">{baseCurrency.flag}</span>
  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
    {base} → {target}
  </span>
  <span className="text-lg">{targetCurrency.flag}</span>
</div>
```

New — split so only the target is interactive:
```tsx
<div className="flex items-center gap-2 flex-1 min-w-0">
  <span className="text-lg">{baseCurrency.flag}</span>
  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
    {base} →
  </span>
  <button
    type="button"
    onClick={() => setPickerOpen(true)}
    aria-label={`Switch target currency, currently ${target}`}
    className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-blue-500 dark:hover:text-blue-400 hover:animate-pulse transition-colors"
  >
    {target} <span className="text-lg">{targetCurrency.flag}</span>
  </button>
</div>
```

### State

Add `const [pickerOpen, setPickerOpen] = useState(false)` alongside the existing `currentRate` state.

### CurrencyPicker render

Add inside the main return, after the chart content:
```tsx
{pickerOpen && (
  <CurrencyPicker
    selected={[base]}
    onAdd={(code) => {
      setPickerOpen(false)
      router.push(`/chart/${base}/${code}`)
    }}
    onClose={() => setPickerOpen(false)}
  />
)}
```

### Import

Add `CurrencyPicker` import: `import CurrencyPicker from '@/components/CurrencyPicker'`

## Known Limitations

- The `CurrencyPicker` header label reads "Add currency" — designed for the main converter flow. In the chart context it means "switch target" but the label is not updated (keeping `CurrencyPicker` unchanged is a deliberate scope decision).

## Out of Scope

- Making the base currency interactive
- Any changes to `CurrencyPicker` itself
- Any other files
