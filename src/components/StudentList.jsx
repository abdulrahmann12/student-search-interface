import { getStudentDisplayName, getStudentSecondaryName } from '../utils/students';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedText({ text, query }) {
  const value = text || 'Unnamed student';
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return value;
  }

  const matcher = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'ig');
  const lowerQuery = trimmedQuery.toLowerCase();

  return value.split(matcher).map((part, index) =>
    part.toLowerCase() === lowerQuery ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-md bg-amber-200 px-1 text-slate-900 dark:bg-amber-300 dark:text-slate-950"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

function getStatusTone(status) {
  switch (status) {
    case 'Match':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200';
    case 'Conflict':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200';
  }
}

function SkeletonRow() {
  return (
    <div className="glass-panel rounded-[28px] p-4">
      <div className="skeleton-shimmer h-4 w-24 rounded-full" />
      <div className="mt-3 skeleton-shimmer h-6 w-40 rounded-2xl" />
      <div className="mt-4 skeleton-shimmer h-12 rounded-3xl" />
    </div>
  );
}

export default function StudentList({
  students,
  isLoading,
  hasDataset,
  query,
  activeStudentRowId,
  highlightedStudentRowId,
  onSelectStudent,
  onHighlightStudent,
  reconciliationByRowId,
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonRow key={index} />
        ))}
      </div>
    );
  }

  if (!hasDataset) {
    return (
      <div className="glass-panel surface-ring rounded-[32px] p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">No workspace yet</p>
        <h2 className="mt-3 text-2xl font-bold text-ink">Upload a semester workbook to begin</h2>
        <p className="mt-3 text-base leading-7 text-muted">
          The student queue appears here once a workspace has been created from the uploaded system sheet.
        </p>
      </div>
    );
  }

  if (!students.length) {
    return (
      <div className="glass-panel surface-ring rounded-[32px] p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">No matches</p>
        <h2 className="mt-3 text-2xl font-bold text-ink">No students match the current search</h2>
        <p className="mt-3 text-base leading-7 text-muted">
          Nothing matches <span className="font-semibold">{query.trim()}</span>. Adjust the search terms or clear the filter.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel surface-ring overflow-hidden rounded-[32px] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Student Queue
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Review students quickly</h2>
        </div>
        <span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-semibold text-accent">
          {students.length} in view
        </span>
      </div>

      <div className="space-y-3">
        {students.map((student) => {
          const reconciliation = reconciliationByRowId[student.rowId];
          const isActive = student.rowId === activeStudentRowId;
          const isHighlighted = student.rowId === highlightedStudentRowId;

          return (
            <button
              key={student.rowId}
              type="button"
              onClick={() => onSelectStudent(student.rowId)}
              onFocus={() => onHighlightStudent(student.rowId)}
              onMouseEnter={() => onHighlightStudent(student.rowId)}
              className={[
                'w-full rounded-[26px] border px-4 py-4 text-left transition duration-200',
                isActive
                  ? 'border-accent bg-accentSoft/70 shadow-float'
                  : isHighlighted
                    ? 'border-slate-300 bg-white/90 dark:border-slate-600 dark:bg-slate-900/50'
                    : 'border-line bg-white/70 hover:bg-white/90 dark:bg-slate-950/35 dark:hover:bg-slate-950/45',
              ].join(' ')}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                    Student ID
                  </p>
                  <p className="mt-2 text-lg font-bold text-ink">
                    <HighlightedText text={student.id} query={query} />
                  </p>
                  <p className="mt-2 truncate text-sm font-semibold text-ink">
                    <HighlightedText text={getStudentDisplayName(student)} query={query} />
                  </p>
                  {getStudentSecondaryName(student) ? (
                    <p className="mt-1 truncate text-sm text-muted font-arabic" dir="rtl">
                      <HighlightedText text={getStudentSecondaryName(student)} query={query} />
                    </p>
                  ) : null}
                </div>

                <span
                  className={[
                    'self-start rounded-full px-3 py-1 text-xs font-semibold',
                    getStatusTone(reconciliation?.status ?? 'Pending'),
                  ].join(' ')}
                >
                  {reconciliation?.status ?? 'Pending'}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted">
                <span className="rounded-full bg-white/85 px-3 py-1 dark:bg-slate-900/70">
                  {reconciliation?.systemCourses.length ?? 0} in system
                </span>
                <span className="rounded-full bg-white/85 px-3 py-1 dark:bg-slate-900/70">
                  {reconciliation?.manualCourses.length ?? 0} on paper
                </span>
                <span className="rounded-full bg-white/85 px-3 py-1 dark:bg-slate-900/70">
                  {reconciliation?.missingInSystem.length ?? 0} paper-only
                </span>
                <span className="rounded-full bg-white/85 px-3 py-1 dark:bg-slate-900/70">
                  {reconciliation?.missingOnPaper.length ?? 0} system-only
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
