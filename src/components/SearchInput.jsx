export default function SearchInput({
  query,
  onQueryChange,
  disabled,
  resultCount,
  totalStudents,
  selectedCount,
  fileName,
  subjectCount,
  isLoading,
}) {
  const resultLabel = disabled
    ? 'Upload a workbook to activate search.'
    : `${resultCount} student${resultCount === 1 ? '' : 's'} found`;

  return (
    <div className="sticky top-4 z-20 mb-6">
      <div className="glass-panel surface-ring rounded-[30px] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              Student Search
            </p>
            <div className="relative mt-3">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                Search
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                disabled={disabled}
                placeholder="Search by ID, English name, or Arabic name"
                className="w-full rounded-2xl border border-line bg-white/80 py-4 pl-24 pr-4 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accentSoft disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950/40"
              />
            </div>
            <p className="mt-3 text-sm text-muted">
              {isLoading ? 'Refreshing the search index...' : resultLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
              {totalStudents} total
            </div>
            <div className="rounded-full bg-accentSoft px-4 py-2 text-sm font-semibold text-accent">
              {selectedCount} selected
            </div>
            <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
              {subjectCount} subjects
            </div>
            {fileName ? (
              <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                {fileName}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
