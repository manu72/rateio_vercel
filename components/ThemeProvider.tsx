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
