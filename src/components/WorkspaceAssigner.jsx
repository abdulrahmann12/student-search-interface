'use client';

import { useCallback, useEffect, useState } from 'react';

// -------------------------------------------------------
// WorkspaceAssigner
// Admin UI to manage which users are assigned to each
// workspace (i.e., which users can see and work on it).
// -------------------------------------------------------
export default function WorkspaceAssigner() {
  const [workspaces, setWorkspaces] = useState([]);
  const [users,      setUsers]      = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState('');
  const [expanded,   setExpanded]   = useState(null); // workspace id currently open
  const [saving,     setSaving]     = useState(null); // workspace id currently saving

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [wsRes, usersRes] = await Promise.all([
        fetch('/api/admin/workspaces'),
        fetch('/api/admin/users'),
      ]);
      const [wsData, usersData] = await Promise.all([wsRes.json(), usersRes.json()]);
      setWorkspaces(wsData.workspaces ?? []);
      // Only non-admin users can be assigned (admins already have full access)
      setUsers((usersData.users ?? []).filter((u) => u.role === 'user' && u.isActive));
    } catch {
      setError('Failed to load workspace data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function saveAssignments(workspaceId, userIds) {
    setSaving(workspaceId);
    try {
      const res = await fetch(`/api/admin/workspaces/${workspaceId}/assignments`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'Failed to save assignments.');
        return;
      }
      // Reload to reflect saved state
      await loadData();
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) return <p className="text-sm text-muted">Loading workspaces…</p>;
  if (error)     return <p className="text-sm text-red-600">{error}</p>;

  if (!workspaces.length) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-muted">No workspaces have been created yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workspaces.map((ws) => {
        const isOpen        = expanded === ws.id;
        const isSaving      = saving   === ws.id;
        const assignedIds   = new Set(ws.assignments.map((a) => a.userId));

        return (
          <div key={ws.id} className="card overflow-hidden">
            {/* Header row */}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : ws.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{ws.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {ws.fileName || 'Uploaded workbook'} · Created by {ws.createdByUsername}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-[8px] bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {ws.assignments.length} assigned
                </span>
                <span className="text-xs text-muted">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Assignment panel */}
            {isOpen && (
              <AssignmentPanel
                workspace={ws}
                allUsers={users}
                assignedIds={assignedIds}
                isSaving={isSaving}
                onSave={(userIds) => saveAssignments(ws.id, userIds)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AssignmentPanel({ workspace, allUsers, assignedIds, isSaving, onSave }) {
  const [selected, setSelected] = useState(() => new Set(assignedIds));

  // Sync if parent refreshes
  useEffect(() => {
    setSelected(new Set(assignedIds));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.id]);

  function toggle(userId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  const isDirty = !eqSets(selected, assignedIds);

  if (!allUsers.length) {
    return (
      <div className="border-t border-line px-5 py-4 text-sm text-muted">
        No non-admin users available to assign.
      </div>
    );
  }

  return (
    <div className="border-t border-line px-5 py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Assign users who can view and work on this workspace
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {allUsers.map((u) => {
          const checked = selected.has(u.id);
          return (
            <label
              key={u.id}
              className={[
                'flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-sm transition',
                checked ? 'border-teal-300 bg-teal-50' : 'border-line bg-white hover:bg-slate-50',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(u.id)}
                className="accent-teal-600"
              />
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{u.username}</span>
              <span className="shrink-0 text-xs text-muted">{u.email}</span>
            </label>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {isDirty && (
          <span className="text-xs text-amber-600 font-semibold">Unsaved changes</span>
        )}
        <button
          type="button"
          disabled={!isDirty || isSaving}
          onClick={() => onSave([...selected])}
          className="btn-primary disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save assignments'}
        </button>
      </div>
    </div>
  );
}

function eqSets(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
