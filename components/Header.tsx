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
          className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
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
