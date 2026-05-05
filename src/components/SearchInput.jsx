export default function SearchInput({
  inputRef,
  query,
  onQueryChange,
  disabled,
  resultCount,
  totalStudents,
  reviewedCount,
  conflictCount,
  pendingCount,
  fileName,
  subjectCount,
  workspaceName,
  isLoading,
}) {
  const resultLabel = disabled
    ? 'Upload a workbook to activate the review queue.'
    : `${resultCount} student${resultCount === 1 ? '' : 's'} in the current result set`;

  return (
    <div className="sticky top-4 z-20 mb-6">
      <div className="glass-panel surface-ring rounded-[30px] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                Student Search
              </p>
              {workspaceName ? (
                <span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-semibold text-accent">
                  {workspaceName}
                </span>
              ) : null}
            </div>

            <div className="relative mt-3">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                Search
              </span>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                disabled={disabled}
                placeholder="Search by student ID, English name, or Arabic name"
                className="w-full rounded-2xl border border-line bg-white/80 py-4 pl-24 pr-4 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accentSoft disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950/40"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted">
              <span>{isLoading ? 'Refreshing the workspace index...' : resultLabel}</span>
              <span className="rounded-full bg-white/80 px-3 py-1 font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                Enter opens courses
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                Ctrl/Cmd+S saves review
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
              {totalStudents} total
            </div>
            <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
              {subjectCount} courses
            </div>
            <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
              {reviewedCount} reviewed
            </div>
            <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
              {pendingCount} pending
            </div>
            <div className="rounded-full bg-accentSoft px-4 py-2 text-sm font-semibold text-accent">
              {conflictCount} conflicts
            </div>
            {fileName ? (
              <div className="max-w-full truncate rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                {fileName}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
