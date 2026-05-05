import StudentCard from './StudentCard';

function SkeletonCard() {
  return (
    <div className="glass-panel rounded-[30px] p-6">
      <div className="skeleton-shimmer h-5 w-24 rounded-full" />
      <div className="mt-4 skeleton-shimmer h-8 w-40 rounded-2xl" />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="skeleton-shimmer h-24 rounded-3xl" />
        <div className="skeleton-shimmer h-24 rounded-3xl" />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton-shimmer h-8 w-24 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export default function StudentList({ students, isLoading, hasDataset, query, onToggleStudent }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (!hasDataset) {
    return (
      <div className="glass-panel surface-ring rounded-[32px] p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">No data yet</p>
        <h2 className="mt-3 text-2xl font-bold text-ink">Upload a workbook to begin</h2>
        <p className="mt-3 text-base leading-7 text-muted">
          The app will build a fast in-memory search index for ID, English names, Arabic names, and subject registrations.
        </p>
      </div>
    );
  }

  if (!students.length) {
    return (
      <div className="glass-panel surface-ring rounded-[32px] p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">No matches</p>
        <h2 className="mt-3 text-2xl font-bold text-ink">No results found</h2>
        <p className="mt-3 text-base leading-7 text-muted">
          Nothing matches "{query.trim()}". Adjust the search terms or clear the filter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {students.map((student, index) => (
        <div
          key={student.rowId}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(index * 40, 220)}ms` }}
        >
          <StudentCard student={student} query={query} onToggleStudent={onToggleStudent} />
        </div>
      ))}
    </div>
  );
}
