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
            className="rounded-md bg-amber-200 px-1 text-slate-900 dark:bg-amber-300 dark:text-slate-950"
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
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200'
      : status === 'Conflict'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200';

  return <span className={['rounded-full px-4 py-2 text-sm font-semibold', tone].join(' ')}>{status}</span>;
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
      <article ref={panelRef} className="glass-panel surface-ring rounded-[32px] p-8" tabIndex={-1}>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Student Detail</p>
        <h2 className="mt-3 text-2xl font-bold text-ink">Select a student to review courses</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
          Choose a student from the queue, compare the physical paper form to the system registrations, then save the review before moving to the next student.
        </p>
      </article>
    );
  }

  const manualKeySet = new Set(reconciliation?.manualSelection.selectedCourseKeys ?? []);

  return (
    <article ref={panelRef} className="glass-panel surface-ring rounded-[32px] p-6 sm:p-7" tabIndex={-1}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Student Detail</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">
            <HighlightedText text={student.id} query={query} />
          </h2>
          <p className="mt-3 text-lg font-semibold text-ink">
            <HighlightedText text={getStudentDisplayName(student)} query={query} />
          </p>
          {getStudentSecondaryName(student) ? (
            <p className="mt-2 text-base text-muted font-arabic" dir="rtl">
              <HighlightedText text={getStudentSecondaryName(student)} query={query} arabic />
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-3">
          <StatusBadge status={reconciliation?.status ?? 'Pending'} />
          {reconciliation?.manualSelection.reviewedAt ? (
            <p className="text-sm text-muted">
              Saved {new Date(reconciliation.manualSelection.reviewedAt).toLocaleString()}
            </p>
          ) : (
            <p className="text-sm text-muted">Not saved yet</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] bg-white/70 p-4 dark:bg-slate-950/35">
          <p className="text-sm text-muted">System courses</p>
          <p className="mt-2 text-2xl font-bold text-ink">{reconciliation?.systemCourses.length ?? 0}</p>
        </div>
        <div className="rounded-[24px] bg-white/70 p-4 dark:bg-slate-950/35">
          <p className="text-sm text-muted">Paper courses</p>
          <p className="mt-2 text-2xl font-bold text-ink">{reconciliation?.manualCourses.length ?? 0}</p>
        </div>
        <div className="rounded-[24px] bg-white/70 p-4 dark:bg-slate-950/35">
          <p className="text-sm text-muted">Missing in system</p>
          <p className="mt-2 text-2xl font-bold text-ink">{reconciliation?.missingInSystem.length ?? 0}</p>
        </div>
        <div className="rounded-[24px] bg-white/70 p-4 dark:bg-slate-950/35">
          <p className="text-sm text-muted">Missing on paper</p>
          <p className="mt-2 text-2xl font-bold text-ink">{reconciliation?.missingOnPaper.length ?? 0}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[26px] border border-line bg-white/70 p-4 dark:bg-slate-950/35">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Paper only</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {reconciliation?.missingInSystem.length ? (
              reconciliation.missingInSystem.map((course) => (
                <span key={course} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                  {course}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted">No paper-only courses.</span>
            )}
          </div>
        </div>

        <div className="rounded-[26px] border border-line bg-white/70 p-4 dark:bg-slate-950/35">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">System only</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {reconciliation?.missingOnPaper.length ? (
              reconciliation.missingOnPaper.map((course) => (
                <span key={course} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-400/15 dark:text-rose-200">
                  {course}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted">No system-only courses.</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-line bg-white/70 p-4 dark:bg-slate-950/35">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Paper Registration Checklist
            </p>
            <p className="mt-2 text-sm text-muted">
              Use Tab to move through courses and Space to toggle the focused checkbox.
            </p>
          </div>
          <span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-semibold text-accent">
            {subjectColumns.length} courses this semester
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {subjectColumns.map((subject, index) => {
            const isSystemSelected = student.subjectFlags[subject.key] === 1;
            const isManualSelected = manualKeySet.has(subject.key);
            const isPaperOnly = reconciliation?.isReviewed && isManualSelected && !isSystemSelected;
            const isSystemOnly = reconciliation?.isReviewed && isSystemSelected && !isManualSelected;

            return (
              <label
                key={subject.key}
                className={[
                  'flex cursor-pointer flex-col gap-4 rounded-[24px] border p-4 transition duration-200 sm:flex-row sm:items-center sm:justify-between',
                  isPaperOnly
                    ? 'border-amber-300 bg-amber-50/80 dark:border-amber-400/20 dark:bg-amber-400/10'
                    : isSystemOnly
                      ? 'border-rose-300 bg-rose-50/80 dark:border-rose-400/20 dark:bg-rose-400/10'
                      : isManualSelected && isSystemSelected
                        ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-400/10'
                        : 'border-line bg-white/80 dark:bg-slate-950/25',
                ].join(' ')}
              >
                <div className="flex items-start gap-4">
                  <input
                    ref={(node) => {
                      checkboxRefs.current[index] = node;
                    }}
                    type="checkbox"
                    checked={isManualSelected}
                    onChange={() => onToggleCourse(subject.key)}
                    tabIndex={-1}
                    data-course-toggle="true"
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-2 focus:ring-teal-500"
                  />

                  <div>
                    <p className="text-base font-semibold text-ink">{subject.displayName}</p>
                    {subject.topLabel && subject.topLabel !== subject.displayName ? (
                      <p className="mt-1 text-sm text-muted">{subject.topLabel}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span
                    className={[
                      'rounded-full px-3 py-1',
                      isSystemSelected
                        ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                    ].join(' ')}
                  >
                    {isSystemSelected ? 'In system' : 'Not in system'}
                  </span>
                  <span
                    className={[
                      'rounded-full px-3 py-1',
                      isManualSelected
                        ? 'bg-accentSoft text-accent'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                    ].join(' ')}
                  >
                    {isManualSelected ? 'Checked on paper' : 'Not checked'}
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
