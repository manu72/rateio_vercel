# Vercel Analytics Integration — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Overview

Add Vercel Web Analytics to Rateio by mounting the `<Analytics />` component from `@vercel/analytics/next` in the root layout. This enables page view and visitor tracking via Vercel's dashboard.

## Context

- Rateio is a Next.js 16 App Router project
- `@vercel/analytics` is already installed
- Web Analytics is already enabled in the Vercel dashboard

## Change

**File:** `app/layout.tsx`

1. Add import: `import { Analytics } from '@vercel/analytics/next';`
2. Add component: `<Analytics />` inside `<body>`, after `{children}`

The `@vercel/analytics/next` variant (not `/react`) is required for App Router — it handles client-side route transitions automatically.

## No other changes required

- No environment variables needed
- No configuration file changes
- No new components or utilities

## Verification

After deployment, a `/_vercel/insights/view` XHR request should appear in the browser Network tab on page load and on route changes.
