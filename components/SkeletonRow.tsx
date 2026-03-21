export default function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm animate-pulse">
      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="w-10 h-4 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="ml-auto w-32 h-10 rounded-lg bg-slate-100 dark:bg-slate-700" />
    </div>
  )
}
