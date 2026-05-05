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

export default function SelectionControls({
  hasWorkspace,
  activeStudent,
  reconciliation,
  reviewedCount,
  conflictCount,
  pendingCount,
  onSaveCurrent,
  onResetCurrent,
  onExport,
  isExporting,
}) {
  const status = reconciliation?.status ?? 'Pending';

  return (
    <div className="glass-panel surface-ring flex flex-col gap-5 rounded-[30px] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Review Controls
          </p>
          <p className="mt-2 text-lg font-semibold text-ink">
            {activeStudent ? `Reviewing ${activeStudent.id}` : 'Select a student to begin'}
          </p>
          <p className="mt-1 text-sm text-muted">
            Save a reviewed student, reset the current paper selection, or export the semester reconciliation workbook.
          </p>
        </div>

        <span className={['rounded-full px-4 py-2 text-sm font-semibold', getStatusTone(status)].join(' ')}>
          {status}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[24px] bg-white/70 p-4 dark:bg-slate-950/35">
          <p className="text-sm text-muted">Reviewed</p>
          <p className="mt-2 text-2xl font-bold text-ink">{reviewedCount}</p>
        </div>
        <div className="rounded-[24px] bg-white/70 p-4 dark:bg-slate-950/35">
          <p className="text-sm text-muted">Conflicts</p>
          <p className="mt-2 text-2xl font-bold text-ink">{conflictCount}</p>
        </div>
        <div className="rounded-[24px] bg-white/70 p-4 dark:bg-slate-950/35">
          <p className="text-sm text-muted">Pending</p>
          <p className="mt-2 text-2xl font-bold text-ink">{pendingCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSaveCurrent}
          disabled={!activeStudent}
          className="btn-primary"
        >
          Save Current Student
        </button>
        <button
          type="button"
          onClick={onResetCurrent}
          disabled={!activeStudent}
          className="btn-secondary"
        >
          Reset Current Review
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={!hasWorkspace || isExporting}
          className="btn-secondary"
        >
          {isExporting ? 'Exporting report...' : 'Export Conflict Report'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
        <span className="rounded-full border border-line px-3 py-2">Arrow Up / Down navigate list</span>
        <span className="rounded-full border border-line px-3 py-2">Enter opens course checklist</span>
        <span className="rounded-full border border-line px-3 py-2">Tab moves across courses</span>
        <span className="rounded-full border border-line px-3 py-2">Space toggles the focused course</span>
      </div>
    </div>
  );
}
