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
          className="rounded bg-amber-200 px-1 text-slate-900"
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
      return 'bg-emerald-100 text-emerald-700';
    case 'Conflict':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function SkeletonRow() {
  return (
    <div className="flex h-10 items-center gap-3 rounded-[10px] border border-line bg-white px-3">
      <div className="skeleton-shimmer h-3 w-16 rounded" />
      <div className="skeleton-shimmer h-3 w-32 rounded" />
      <div className="skeleton-shimmer ml-auto h-5 w-14 rounded" />
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
      <div className="card p-6 text-center">
        <p className="text-sm font-semibold text-ink">Upload a semester workbook to begin</p>
        <p className="mt-1 text-xs text-muted">The student list appears after a workspace is created.</p>
      </div>
    );
  }

  if (!students.length) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm font-semibold text-ink">No students match the current search</p>
        <p className="mt-1 text-xs text-muted">Try adjusting or clearing the filter.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_2fr_80px_auto] items-center gap-3 border-b border-line bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <span>ID</span>
        <span>Name</span>
        <span className="text-center">Status</span>
        <span className="text-right">{students.length} shown</span>
      </div>

      <div className="divide-y divide-line">
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
                'grid w-full grid-cols-[1fr_2fr_80px_auto] items-center gap-3 px-3 py-2 text-left text-sm transition duration-100',
                isActive
                  ? 'bg-teal-50'
                  : isHighlighted
                    ? 'bg-slate-50'
                    : 'bg-white hover:bg-slate-50',
              ].join(' ')}
            >
              <span className="truncate font-mono text-xs font-semibold text-ink">
                <HighlightedText text={student.id} query={query} />
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  <HighlightedText text={getStudentDisplayName(student)} query={query} />
                </p>
                {getStudentSecondaryName(student) ? (
                  <p className="truncate text-xs text-muted font-arabic" dir="rtl">
                    <HighlightedText text={getStudentSecondaryName(student)} query={query} />
                  </p>
                ) : null}
              </div>

              <span
                className={[
                  'justify-self-center rounded-[10px] px-2 py-0.5 text-xs font-semibold',
                  getStatusTone(reconciliation?.status ?? 'Pending'),
                ].join(' ')}
              >
                {reconciliation?.status ?? 'Pending'}
              </span>

              <div className="flex gap-1.5 text-xs text-muted">
                <span>{reconciliation?.systemCourses.length ?? 0} sys</span>
                <span className="text-slate-300">|</span>
                <span>{reconciliation?.manualCourses.length ?? 0} paper</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
