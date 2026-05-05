import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            History / Workspace
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Saved semesters</h2>
        </div>
        <div className="rounded-[10px] bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          {workspaces.length}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted">
        Each workspace represents one uploaded semester workbook. Your workspaces are saved in the database and accessible from any device.
      </p>

      {persistenceError ? (
        <p className="mt-4 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {persistenceError}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {!isHydrated ? (
          <div className="rounded-[10px] border border-line bg-white px-4 py-5 text-sm text-muted">
            Restoring saved workspaces...
          </div>
        ) : null}

        {isHydrated && !workspaces.length ? (
          <div className="rounded-[10px] border border-dashed border-line bg-white px-4 py-5 text-sm leading-6 text-muted">
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
                'rounded-[10px] border p-4 transition duration-150',
                isActive
                  ? 'border-teal-300 bg-teal-50'
                  : 'border-line bg-white hover:bg-slate-50',
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
                  {workspace.createdByUsername && (
                    <p className="mt-0.5 text-xs text-muted">
                      Created by{' '}
                      <span className="font-semibold text-slate-600">{workspace.createdByUsername}</span>
                    </p>
                  )}
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onRemoveWorkspace(workspace.id)}
                    className="rounded-[10px] border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-slate-50"
                    aria-label={`Remove ${workspace.name}`}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-[10px] bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {summary.totalStudents} students
                </span>
                <span className="rounded-[10px] bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {summary.reviewedCount} reviewed
                </span>
                <span className="rounded-[10px] bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
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