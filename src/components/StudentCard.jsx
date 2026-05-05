import { getStudentDisplayName, getStudentSecondaryName } from '../utils/students';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedText({ text, query, arabic = false }) {
  const value = text || 'Not available';
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return <span className={arabic ? 'font-arabic' : ''}>{value}</span>;
  }

  const matcher = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'ig');
  const parts = value.split(matcher);
  const lowerQuery = trimmedQuery.toLowerCase();

  return (
    <span className={arabic ? 'font-arabic' : ''}>
      {parts.map((part, index) =>
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
      )}
    </span>
  );
}

function StatusBadge({ status }) {
  const tone =
    status === 'Match'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'Conflict'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600';

  return <span className={['rounded-[10px] px-2.5 py-0.5 text-xs font-semibold', tone].join(' ')}>{status}</span>;
}

export default function StudentCard({
  panelRef,
  student,
  query,
  subjectColumns,
  reconciliation,
  onToggleCourse,
  checkboxRefs,
}) {
  if (!student) {
    return (
      <article ref={panelRef} className="card p-5" tabIndex={-1}>
        <p className="text-sm font-semibold text-ink">Select a student to review courses</p>
        <p className="mt-1 text-xs text-muted">Choose a student from the list to compare paper form against system data.</p>
      </article>
    );
  }

  const manualKeySet = new Set(reconciliation?.manualSelection.selectedCourseKeys ?? []);

  return (
    <article ref={panelRef} className="card p-4" tabIndex={-1}>
      {/* Student header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-muted">
            <HighlightedText text={student.id} query={query} />
          </p>
          <p className="mt-0.5 text-base font-bold text-ink">
            <HighlightedText text={getStudentDisplayName(student)} query={query} />
          </p>
          {getStudentSecondaryName(student) ? (
            <p className="mt-0.5 text-sm text-muted font-arabic" dir="rtl">
              <HighlightedText text={getStudentSecondaryName(student)} query={query} arabic />
            </p>
          ) : null}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <StatusBadge status={reconciliation?.status ?? 'Pending'} />
          <p className="text-xs text-muted">
            {reconciliation?.manualSelection.reviewedAt
              ? `Saved ${new Date(reconciliation.manualSelection.reviewedAt).toLocaleDateString()}`
              : 'Not saved'}
          </p>
        </div>
      </div>

      {/* Compact stat row */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <div className="rounded-[10px] bg-slate-50 px-3 py-2">
          <p className="text-xs text-muted">System</p>
          <p className="text-lg font-bold text-ink">{reconciliation?.systemCourses.length ?? 0}</p>
        </div>
        <div className="rounded-[10px] bg-slate-50 px-3 py-2">
          <p className="text-xs text-muted">Paper</p>
          <p className="text-lg font-bold text-ink">{reconciliation?.manualCourses.length ?? 0}</p>
        </div>
        <div className="rounded-[10px] bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-600">Paper only</p>
          <p className="text-lg font-bold text-amber-700">{reconciliation?.missingInSystem.length ?? 0}</p>
        </div>
        <div className="rounded-[10px] bg-rose-50 px-3 py-2">
          <p className="text-xs text-rose-600">Sys only</p>
          <p className="text-lg font-bold text-rose-700">{reconciliation?.missingOnPaper.length ?? 0}</p>
        </div>
      </div>

      {/* Conflict pills */}
      {((reconciliation?.missingInSystem.length ?? 0) > 0 ||
        (reconciliation?.missingOnPaper.length ?? 0) > 0) ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reconciliation.missingInSystem.map((course) => (
            <span key={course} className="rounded-[10px] bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {course} (paper)
            </span>
          ))}
          {reconciliation.missingOnPaper.map((course) => (
            <span key={course} className="rounded-[10px] bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
              {course} (sys)
            </span>
          ))}
        </div>
      ) : null}

      {/* Course checklist */}
      <div className="mt-3 rounded-[10px] border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Paper Registration Checklist</p>
          <span className="rounded-[10px] bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
            {subjectColumns.length} courses
          </span>
        </div>

        <div className="divide-y divide-line">
          {subjectColumns.map((subject, index) => {
            const isSystemSelected = student.subjectFlags[subject.key] === 1;
            const isManualSelected = manualKeySet.has(subject.key);
            const isPaperOnly = reconciliation?.isReviewed && isManualSelected && !isSystemSelected;
            const isSystemOnly = reconciliation?.isReviewed && isSystemSelected && !isManualSelected;

            return (
              <label
                key={subject.key}
                className={[
                  'flex cursor-pointer items-center gap-3 px-3 py-2 transition duration-100',
                  isPaperOnly
                    ? 'bg-amber-50'
                    : isSystemOnly
                      ? 'bg-rose-50'
                      : isManualSelected && isSystemSelected
                        ? 'bg-emerald-50'
                        : 'bg-white hover:bg-slate-50',
                ].join(' ')}
              >
                <input
                  ref={(node) => {
                    checkboxRefs.current[index] = node;
                  }}
                  type="checkbox"
                  checked={isManualSelected}
                  onChange={() => onToggleCourse(subject.key)}
                  tabIndex={-1}
                  data-course-toggle="true"
                  className="h-4 w-4 flex-shrink-0 rounded border-slate-300 text-teal-600 focus:ring-2 focus:ring-teal-500"
                />

                <span className="min-w-0 flex-1 text-sm font-medium text-ink">{subject.displayName}</span>

                <div className="flex flex-shrink-0 gap-1.5 text-xs font-semibold">
                  <span
                    className={[
                      'rounded-[10px] px-2 py-0.5',
                      isSystemSelected ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500',
                    ].join(' ')}
                  >
                    {isSystemSelected ? 'Sys ✓' : 'Sys ✗'}
                  </span>
                  <span
                    className={[
                      'rounded-[10px] px-2 py-0.5',
                      isManualSelected ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500',
                    ].join(' ')}
                  >
                    {isManualSelected ? 'Paper ✓' : 'Paper ✗'}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </article>
  );
}
