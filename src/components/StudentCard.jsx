import { useState } from 'react';

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

export default function StudentCard({ student, query, onToggleStudent }) {
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  function handleSubjectClick(subject) {
    setSelectedSubjects((currentSubjects) =>
      currentSubjects.includes(subject)
        ? currentSubjects.filter((currentSubject) => currentSubject !== subject)
        : [...currentSubjects, subject],
    );
  }

  return (
    <article
      className={[
        'glass-panel card-hover rounded-[30px] p-6 transition duration-300',
        student.checked
          ? 'border-teal-400/70 bg-teal-50/80 ring-1 ring-teal-300 dark:bg-teal-400/10'
          : 'bg-surface',
      ].join(' ')}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Student ID</p>
          <h3 className="mt-2 text-2xl font-bold text-ink">
            <HighlightedText text={student.id} query={query} />
          </h3>
        </div>

        <label className="inline-flex items-center gap-3 self-start rounded-full border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-950/40 dark:text-slate-100">
          <input
            type="checkbox"
            checked={student.checked}
            onChange={(event) => onToggleStudent(student.rowId, event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span>{student.checked ? 'Selected' : 'Select student'}</span>
        </label>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-white/65 p-4 dark:bg-slate-950/35">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">English name</p>
          <p className="mt-2 text-lg font-semibold text-ink">
            <HighlightedText text={student.name_en} query={query} />
          </p>
        </div>

        <div className="rounded-3xl bg-white/65 p-4 dark:bg-slate-950/35">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Arabic name</p>
          <p className="mt-2 text-lg font-semibold text-ink font-arabic" dir="rtl">
            <HighlightedText text={student.name_ar} query={query} arabic />
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Registered subjects
          </p>
          <span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-semibold text-accent">
            {student.registeredSubjects.length} active
          </span>
        </div>
        <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-white/65 dark:bg-slate-950/35">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100/80 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Subject
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {student.registeredSubjects.length ? (
                student.registeredSubjects.map((subject) => {
                  const isSelected = selectedSubjects.includes(subject);

                  return (
                    <tr
                      key={subject}
                      className={[
                        'transition-colors duration-200',
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-400/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/50',
                      ].join(' ')}
                    >
                      <td className="w-full p-0">
                        <button
                          type="button"
                          onClick={() => handleSubjectClick(subject)}
                          className={[
                            'flex w-full items-center justify-between px-4 py-4 text-left font-medium text-ink',
                            isSelected ? 'text-teal-700 dark:text-teal-200' : '',
                          ].join(' ')}
                          aria-pressed={isSelected}
                        >
                          <span>{subject}</span>
                          {isSelected ? (
                            <span className="rounded-full bg-accentSoft px-2.5 py-1 text-xs font-semibold text-accent">
                              Selected
                            </span>
                          ) : null}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-4 text-muted">No registered subjects</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}
