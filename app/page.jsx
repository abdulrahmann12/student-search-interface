'use client';

import ExcelUpload from '@/src/components/ExcelUpload';
import { useAuth } from '@/src/context/AuthContext';
import { useWorkspaceContext } from '@/src/context/WorkspaceContext';
import { useExcelParser } from '@/src/hooks/useExcelParser';
import { buildWorkspaceSummary } from '@/src/utils/reconciliation';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HomePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { workspaces, actions, isHydrated, persistenceError } = useWorkspaceContext();
  const { isParsing, error, pendingFileName, parseFile } = useExcelParser();
  const router = useRouter();
  const wasParsing = useRef(false);
  const isAdmin = user?.role === 'admin';

  // Navigate to newly created workspace after upload completes
  useEffect(() => {
    if (isParsing) {
      wasParsing.current = true;
      return;
    }
    if (wasParsing.current && !error && workspaces.length > 0) {
      wasParsing.current = false;
      router.push(`/workspace/${workspaces[0].id}`);
    }
  }, [isParsing, error, workspaces, router]);

  const workspaceSummaries = useMemo(
    () => Object.fromEntries(workspaces.map((w) => [w.id, buildWorkspaceSummary(w)])),
    [workspaces],
  );

  return (
    <main className="mx-auto max-w-[1500px] px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          {isAdmin
            ? 'Upload a semester workbook or continue a saved workspace.'
            : 'Select a workspace assigned to you to begin reviewing students.'}
        </p>
      </div>

      <div className={['grid gap-8', isAdmin ? 'lg:grid-cols-[420px_minmax(0,1fr)]' : ''].join(' ')}>
        {/* Upload — admin only */}
        {isAdmin && (
          <div>
            <ExcelUpload
              onFileSelect={parseFile}
              isLoading={isParsing}
              fileName={pendingFileName}
              error={error}
            />
          </div>
        )}

        {/* Workspace list */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">Saved Workspaces</h2>
            <span className="rounded-[10px] bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
            </span>
          </div>

          {persistenceError ? (
            <p className="mb-4 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {persistenceError}
            </p>
          ) : null}

          {!isHydrated ? (
            <div className="card p-6 text-center text-sm text-muted">
              {isAuthLoading ? 'Loading…' : 'Restoring saved workspaces…'}
            </div>
          ) : !workspaces.length ? (
            <div className="card border-dashed p-12 text-center">
              <p className="text-base font-semibold text-ink">No workspaces yet</p>
              <p className="mt-2 text-sm text-muted">
                {isAdmin
                  ? 'Upload an Excel workbook on the left to create your first workspace.'
                  : 'No workspaces have been assigned to your account yet. Contact an admin.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {workspaces.map((workspace) => {
                const summary = workspaceSummaries[workspace.id];
                return (
                  <div key={workspace.id} className="card p-4">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-ink">
                          {workspace.name}
                        </p>
                        <p className="mt-0.5 text-sm text-muted">
                          {workspace.fileName || 'Uploaded workbook'}
                        </p>
                        {workspace.createdByUsername && (
                          <p className="mt-0.5 text-xs text-muted">
                            Created by{' '}
                            <span className="font-semibold text-slate-600">
                              {workspace.createdByUsername}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/workspace/${workspace.id}`)}
                          className="btn-primary px-4 py-1.5 text-xs"
                        >
                          Open
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => actions.removeWorkspace(workspace.id)}
                            className="btn-secondary px-3 py-1.5 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-[10px] bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {summary.totalStudents} students
                      </span>
                      <span className="rounded-[10px] bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {summary.reviewedCount} reviewed
                      </span>
                      <span className="rounded-[10px] bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {summary.conflictCount} conflicts
                      </span>
                      <span className="rounded-[10px] bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {summary.pendingCount} pending
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted">Updated {formatDate(workspace.updatedAt)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}