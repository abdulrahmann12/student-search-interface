'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useWorkspaceContext } from '../context/WorkspaceContext';

export default function AppHeader() {
  const { workspaces } = useWorkspaceContext();
  const { user, logout } = useAuth();
  const params = useParams();

  const workspaceId = params?.id ?? null;
  const rowId       = params?.rowId ?? null;

  const workspace = workspaceId
    ? (workspaces.find((w) => w.id === workspaceId) ?? null)
    : null;

  const student =
    rowId && workspace
      ? (workspace.students.find((s) => s.rowId === rowId) ?? null)
      : null;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1500px] items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="text-sm font-bold text-ink transition-colors hover:text-teal-700"
        >
          Reconciliation
        </Link>

        {workspace ? (
          <>
            <span className="select-none text-slate-300">/</span>
            <Link
              href={`/workspace/${workspace.id}`}
              className="max-w-[200px] truncate text-sm font-semibold text-muted transition-colors hover:text-teal-700"
            >
              {workspace.name}
            </Link>
          </>
        ) : null}

        {student ? (
          <>
            <span className="select-none text-slate-300">/</span>
            <span className="text-sm font-semibold text-ink">{student.id}</span>
          </>
        ) : null}

        {/* Spacer */}
        <div className="ml-auto flex items-center gap-3">
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className="rounded-[8px] px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 transition"
            >
              Admin
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted sm:inline">
                {user.username}
                {user.role === 'admin' && (
                  <span className="ml-1.5 rounded-[6px] bg-teal-100 px-1.5 py-0.5 text-teal-700">
                    admin
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-[8px] border border-line px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
