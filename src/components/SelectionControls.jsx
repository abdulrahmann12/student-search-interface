export default function SelectionControls({
  visibleCount,
  totalCount,
  selectedCount,
  allVisibleSelected,
  onToggleVisible,
  onClearAll,
  onExport,
  isExporting,
}) {
  const visibleLabel = visibleCount === totalCount ? 'all students' : `${visibleCount} visible result${visibleCount === 1 ? '' : 's'}`;

  return (
    <div className="glass-panel surface-ring mb-6 flex flex-col gap-4 rounded-[30px] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Selection Tools
        </p>
        <p className="mt-2 text-lg font-semibold text-ink">
          {selectedCount} of {totalCount} students selected
        </p>
        <p className="mt-1 text-sm text-muted">Apply selection to {visibleLabel}, then export the updated workbook.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onToggleVisible} disabled={!visibleCount} className="btn-secondary">
          {allVisibleSelected ? 'Clear visible' : 'Select visible'}
        </button>
        <button type="button" onClick={onClearAll} disabled={!selectedCount} className="btn-secondary">
          Clear all
        </button>
        <button type="button" onClick={onExport} disabled={!totalCount || isExporting} className="btn-primary">
          {isExporting ? 'Exporting...' : 'Export Updated Excel'}
        </button>
      </div>
    </div>
  );
}
