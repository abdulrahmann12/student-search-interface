function formatRelativeUpdate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Saved locally';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function WorkspaceSidebar({
  isHydrated,
  workspaces,
  activeWorkspaceId,
  workspaceSummaries,
  onSelectWorkspace,
  onRemoveWorkspace,
  persistenceError,
}) {
  return (
    <div className="glass-panel surface-ring rounded-[32px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            History / Workspace
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Saved semesters</h2>
        </div>
        <div className="rounded-full bg-accentSoft px-3 py-1 text-xs font-semibold text-accent">
          {workspaces.length}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted">
        Every upload creates an isolated workspace and persists it in this browser so refreshes do not wipe the operator&apos;s progress.
      </p>

      {persistenceError ? (
        <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
          {persistenceError}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {!isHydrated ? (
          <div className="rounded-[26px] border border-line bg-white/65 px-4 py-5 text-sm text-muted dark:bg-slate-950/35">
            Restoring saved workspaces...
          </div>
        ) : null}

        {isHydrated && !workspaces.length ? (
          <div className="rounded-[26px] border border-dashed border-line bg-white/65 px-4 py-5 text-sm leading-6 text-muted dark:bg-slate-950/35">
            Upload the semester intersection workbook to create the first workspace.
          </div>
        ) : null}

        {workspaces.map((workspace) => {
          const summary = workspaceSummaries[workspace.id] ?? {
            reviewedCount: 0,
            conflictCount: 0,
            totalStudents: 0,
          };
          const isActive = workspace.id === activeWorkspaceId;

          return (
            <div
              key={workspace.id}
              className={[
                'rounded-[26px] border p-4 transition duration-200',
                isActive
                  ? 'border-accent bg-accentSoft/80'
                  : 'border-line bg-white/70 hover:bg-white/90 dark:bg-slate-950/35 dark:hover:bg-slate-950/45',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onSelectWorkspace(workspace.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-base font-semibold text-ink">{workspace.name}</p>
                  <p className="mt-1 text-sm text-muted">{workspace.fileName || 'Uploaded workbook'}</p>
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveWorkspace(workspace.id)}
                  className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted transition hover:bg-white/80 dark:hover:bg-slate-900/60"
                  aria-label={`Remove ${workspace.name}`}
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
                  {summary.totalStudents} students
                </span>
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
                  {summary.reviewedCount} reviewed
                </span>
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
                  {summary.conflictCount} conflicts
                </span>
              </div>

              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Updated {formatRelativeUpdate(workspace.updatedAt)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}