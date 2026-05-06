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
  subjectCount,
}) {
  const resultLabel = disabled
    ? 'Upload a workbook to search'
    : `${resultCount ?? 0} student${resultCount === 1 ? '' : 's'} shown`;

  return (
    <div className="mb-6 card p-3">
      <div className="flex items-center gap-3">
        {/* Search input */}
        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            disabled={disabled}
            placeholder="Search by student ID, English name, or Arabic name..."
            className="w-full rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="mt-1.5 pl-1 text-xs text-muted">{resultLabel}</p>
        </div>

        {/* Stat badges */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <span className="rounded-[10px] bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {totalStudents} total
          </span>
          <span className="hidden rounded-[10px] bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 sm:inline">
            {subjectCount} courses
          </span>
          <span className="rounded-[10px] bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {reviewedCount} reviewed
          </span>
          <span className="rounded-[10px] bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {pendingCount} pending
          </span>
          <span className="rounded-[10px] bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">
            {conflictCount} conflicts
          </span>
        </div>
      </div>
    </div>
  );
}
