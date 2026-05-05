import { useEffect, useMemo, useState } from 'react';
import { getStudentDisplayName, getStudentSecondaryName } from '../utils/students';

const STATUS_FILTERS = ['All', 'Match', 'Conflict', 'Pending'];
const PAGE_SIZE = 50;

const SORT_OPTIONS = [
  { value: 'default', label: 'Default order' },
  { value: 'name-asc', label: 'Name A → Z' },
  { value: 'name-desc', label: 'Name Z → A' },
  { value: 'id-asc', label: 'ID ascending' },
  { value: 'id-desc', label: 'ID descending' },
  { value: 'status', label: 'Status' },
];

const STATUS_SORT_ORDER = { Match: 0, Conflict: 1, Pending: 2 };

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
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [page, setPage] = useState(1);

  // Reset to page 1 when filter or sort changes
  useEffect(() => { setPage(1); }, [statusFilter, sortBy]);

  const displayStudents = useMemo(() => {
    let list = students;

    if (statusFilter !== 'All') {
      list = list.filter((student) => {
        const status = reconciliationByRowId[student.rowId]?.status ?? 'Pending';
        return status === statusFilter;
      });
    }

    if (sortBy === 'name-asc') {
      list = [...list].sort((a, b) =>
        (getStudentDisplayName(a) ?? '').localeCompare(getStudentDisplayName(b) ?? ''),
      );
    } else if (sortBy === 'name-desc') {
      list = [...list].sort((a, b) =>
        (getStudentDisplayName(b) ?? '').localeCompare(getStudentDisplayName(a) ?? ''),
      );
    } else if (sortBy === 'id-asc') {
      list = [...list].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));
    } else if (sortBy === 'id-desc') {
      list = [...list].sort((a, b) => (b.id ?? '').localeCompare(a.id ?? ''));
    } else if (sortBy === 'status') {
      list = [...list].sort((a, b) => {
        const sa = STATUS_SORT_ORDER[reconciliationByRowId[a.rowId]?.status ?? 'Pending'] ?? 2;
        const sb = STATUS_SORT_ORDER[reconciliationByRowId[b.rowId]?.status ?? 'Pending'] ?? 2;
        return sa - sb;
      });
    }

    return list;
  }, [students, statusFilter, sortBy, reconciliationByRowId]);

  const totalPages   = Math.ceil(displayStudents.length / PAGE_SIZE);
  const safePage     = Math.min(Math.max(page, 1), Math.max(1, totalPages));
  const pagedStudents = useMemo(
    () => {
      // if filter/sort changed and current page is out of range, render first page
      return displayStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    },
    [displayStudents, safePage],
  );

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

  return (
    <div className="card overflow-hidden">
      {/* Filters + sort bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-3 py-2">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={[
                'rounded-[8px] px-2.5 py-1 text-xs font-semibold transition',
                statusFilter === status
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {status}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-[8px] border border-line bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_2fr_80px_auto] items-center gap-3 border-b border-line bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <span>ID</span>
        <span>Name</span>
        <span className="text-center">Status</span>
        <span className="text-right">
          {displayStudents.length} shown
          {totalPages > 1 && ` · p. ${safePage}/${totalPages}`}
        </span>
      </div>

      {!displayStudents.length ? (
        <div className="p-6 text-center">
          <p className="text-sm font-semibold text-ink">No students match the current filters</p>
          <p className="mt-1 text-xs text-muted">Try adjusting the status filter or search query.</p>
        </div>
      ) : null}

      <div className="divide-y divide-line">
        {pagedStudents.map((student) => {
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line bg-slate-50 px-3 py-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-xs text-muted">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
