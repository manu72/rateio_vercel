export default function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm animate-pulse">
      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="flex flex-col gap-1">
        <div className="w-10 h-3 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="w-16 h-2 rounded bg-slate-100 dark:bg-slate-600" />
      </div>
      <div className="ml-auto w-20 h-6 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}
