import Image from 'next/image'

interface HeaderProps {
  updatedAt: string | null  // ISO string or null while loading
}

export default function Header({ updatedAt }: HeaderProps) {
  const label = updatedAt
    ? `Updated ${formatRelative(updatedAt)}`
    : 'Loading rates...'

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
      <span className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
        <Image src="/favicon-32x32.png" alt="Rateio logo" width={24} height={24} />
        Rateio
      </span>
      <span className="text-xs text-slate-400">{label}</span>
    </header>
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
