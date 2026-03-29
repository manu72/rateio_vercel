export default function ChartLoading() {
  return (
    <main className="max-w-[430px] md:max-w-[600px] mx-auto min-h-screen flex flex-col">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded motion-safe:animate-pulse justify-self-start" />
        <div className="h-7 w-36 bg-slate-200 dark:bg-slate-700 rounded motion-safe:animate-pulse justify-self-center" />
        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-xl motion-safe:animate-pulse justify-self-end" />
      </header>

      <div className="flex-1 px-4 py-4 flex flex-col gap-4">
        {/* Time range selector */}
        <div className="flex gap-2 justify-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-11 bg-slate-200 dark:bg-slate-700 rounded-lg motion-safe:animate-pulse" />
          ))}
        </div>

        {/* Chart area */}
        <div className="h-56 bg-slate-100 dark:bg-slate-800 rounded-xl motion-safe:animate-pulse" />

        {/* Rate card */}
        <div className="flex flex-col gap-3 rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded motion-safe:animate-pulse" />
          <div className="flex gap-3">
            <div className="flex-1 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg motion-safe:animate-pulse" />
            <div className="flex-1 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  )
}
