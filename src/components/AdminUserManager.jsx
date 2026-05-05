'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { admin: 'Admin', user: 'User' };

const ACTION_LABELS = {
  login:                 'Login',
  logout:                'Logout',
  create_workspace:      'Created workspace',
  delete_workspace:      'Deleted workspace',
  save_review:           'Saved review',
  reset_review:          'Reset review',
  edit_selection:        'Edited selection',
  export:                'Exported report',
  admin_create_user:     'Created user',
  admin_update_user:     'Updated user',
  admin_assign_workspace:'Assigned workspace',
};

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return '—'; }
}

// -------------------------------------------------------
// User Management panel
// -------------------------------------------------------
export function UserManager() {
  const { user: currentUser } = useAuth();
  const [users,     setUsers]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [formError, setFormError] = useState('');
  const [saving,    setSaving]    = useState(false);

  const [form, setForm] = useState({
    username: '', email: '', password: '', role: 'user',
  });

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res  = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? 'Failed to create user.'); return; }
      setForm({ username: '', email: '', password: '', role: 'user' });
      setShowForm(false);
      await loadUsers();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isActive: !user.isActive }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? 'Failed to update user.');
      return;
    }
    await loadUsers();
  }

  async function resetPassword(user) {
    // Cannot reset password for another admin
    if (user.role === 'admin' && user.id !== currentUser?.id) {
      alert('You cannot change the password of another admin account.');
      return;
    }
    const newPwd = window.prompt(`New password for "${user.username}" (min 8 chars):`);
    if (!newPwd) return;
    if (newPwd.length < 8) { alert('Password must be at least 8 characters.'); return; }
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: newPwd }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) alert('Password updated successfully.');
    else alert(data.error ?? 'Failed to update password.');
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-ink">Users</h2>
        <button
          type="button"
          className="btn-primary"
          onClick={() => { setShowForm((v) => !v); setFormError(''); }}
        >
          {showForm ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 grid gap-4 p-5 sm:grid-cols-2">
          {formError && (
            <p className="col-span-2 rounded-[10px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Username</label>
            <input
              required type="text" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="input-field w-full" placeholder="john.doe"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Email</label>
            <input
              required type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field w-full" placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Password</label>
            <input
              required type="password" value={form.password} minLength={8}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field w-full" placeholder="Min. 8 characters"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="input-field w-full"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating...' : 'Create user'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-muted">Loading users...</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 text-left">Username</th>
                <th className="px-4 py-2.5 text-left">Email</th>
                <th className="px-4 py-2.5 text-left">Role</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left">Created</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isOtherAdmin = u.role === 'admin' && !isSelf;
                return (
                  <tr key={u.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-ink">
                      {u.username}
                      {isSelf && (
                        <span className="ml-1.5 rounded-[6px] bg-teal-100 px-1.5 py-0.5 text-xs text-teal-700">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className={[
                        'rounded-[8px] px-2 py-0.5 text-xs font-semibold',
                        u.role === 'admin'
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-slate-100 text-slate-600',
                      ].join(' ')}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={[
                        'rounded-[8px] px-2 py-0.5 text-xs font-semibold',
                        u.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600',
                      ].join(' ')}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => toggleActive(u)}
                            className="rounded-[8px] px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                        {!isOtherAdmin && (
                          <button
                            type="button"
                            onClick={() => resetPassword(u)}
                            className="rounded-[8px] px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            Reset pw
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!users.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------
// Activity logs panel  (with filters)
// -------------------------------------------------------
const FILTER_ACTIONS = [
  '', 'login', 'logout', 'create_workspace', 'delete_workspace',
  'save_review', 'reset_review', 'edit_selection', 'export',
  'admin_create_user', 'admin_update_user', 'admin_assign_workspace',
];

export function ActivityLogs() {
  const [logs,      setLogs]      = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState('');
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const LIMIT = 50;

  // Filters
  const [filterUsername,  setFilterUsername]  = useState('');
  const [filterAction,    setFilterAction]    = useState('');
  const [filterWorkspace, setFilterWorkspace] = useState('');
  const [filterDateFrom,  setFilterDateFrom]  = useState('');
  const [filterDateTo,    setFilterDateTo]    = useState('');

  // Debounce text inputs
  const usernameTimer  = useRef(null);
  const workspaceTimer = useRef(null);

  const [debouncedUsername,  setDebouncedUsername]  = useState('');
  const [debouncedWorkspace, setDebouncedWorkspace] = useState('');

  useEffect(() => {
    clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(() => setDebouncedUsername(filterUsername), 400);
    return () => clearTimeout(usernameTimer.current);
  }, [filterUsername]);

  useEffect(() => {
    clearTimeout(workspaceTimer.current);
    workspaceTimer.current = setTimeout(() => setDebouncedWorkspace(filterWorkspace), 400);
    return () => clearTimeout(workspaceTimer.current);
  }, [filterWorkspace]);

  const buildQuery = useCallback((p = 1) => {
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
    if (debouncedUsername)  params.set('username',    debouncedUsername);
    if (filterAction)       params.set('action',      filterAction);
    if (debouncedWorkspace) params.set('workspaceId', debouncedWorkspace);
    if (filterDateFrom)     params.set('dateFrom',    filterDateFrom);
    if (filterDateTo)       params.set('dateTo',      filterDateTo);
    return `/api/logs?${params.toString()}`;
  }, [debouncedUsername, filterAction, debouncedWorkspace, filterDateFrom, filterDateTo]);

  const loadLogs = useCallback(async (p = 1) => {
    setIsLoading(true);
    try {
      const res  = await fetch(buildQuery(p));
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch {
      setError('Failed to load logs.');
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery]);

  // Reload on filter change, reset to page 1
  useEffect(() => { loadLogs(1); }, [loadLogs]);

  const totalPages = Math.ceil(total / LIMIT);

  function clearFilters() {
    setFilterUsername('');
    setFilterAction('');
    setFilterWorkspace('');
    setFilterDateFrom('');
    setFilterDateTo('');
  }

  const hasFilters = filterUsername || filterAction || filterWorkspace || filterDateFrom || filterDateTo;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-ink">Activity Logs</h2>
        <span className="text-xs text-muted">{total} total entries</span>
      </div>

      {/* Filter bar */}
      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Username</label>
          <input
            type="text" value={filterUsername} placeholder="Search user…"
            onChange={(e) => setFilterUsername(e.target.value)}
            className="input-field w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Action</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="input-field w-full"
          >
            {FILTER_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a ? (ACTION_LABELS[a] ?? a) : 'All actions'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Workspace ID</label>
          <input
            type="text" value={filterWorkspace} placeholder="Workspace ID…"
            onChange={(e) => setFilterWorkspace(e.target.value)}
            className="input-field w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">From date</label>
          <input
            type="date" value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="input-field w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">To date</label>
          <input
            type="date" value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="input-field w-full"
          />
        </div>
        {hasFilters && (
          <div className="xl:col-span-5 flex justify-end">
            <button type="button" onClick={clearFilters} className="btn-secondary text-xs">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-muted">Loading logs…</p>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 text-left">Time</th>
                  <th className="px-4 py-2.5 text-left">User</th>
                  <th className="px-4 py-2.5 text-left">Action</th>
                  <th className="px-4 py-2.5 text-left">Workspace</th>
                  <th className="px-4 py-2.5 text-left">Student row</th>
                  <th className="px-4 py-2.5 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((log) => (
                  <tr key={log.id} className="bg-white hover:bg-slate-50 align-top">
                    <td className="px-4 py-2.5 text-xs text-muted whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-ink">{log.username}</p>
                      {log.userEmail && (
                        <p className="text-xs text-muted">{log.userEmail}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-[8px] bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {log.workspaceName ? (
                        <span className="text-ink">{log.workspaceName}</span>
                      ) : log.workspaceId ? (
                        <span className="font-mono text-muted">{log.workspaceId}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted font-mono">
                      {log.studentRowId ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted max-w-[240px]">
                      {log.details ? (
                        <LogDetails details={log.details} />
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {!logs.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                      No log entries match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => loadLogs(page - 1)}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => loadLogs(page + 1)}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Render log details object as readable key-value pairs. */
function LogDetails({ details }) {
  if (!details || typeof details !== 'object') return String(details);
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined);
  if (!entries.length) return '—';
  return (
    <ul className="space-y-0.5">
      {entries.map(([k, v]) => (
        <li key={k}>
          <span className="text-slate-500">{k}:</span>{' '}
          <span className="text-ink">
            {Array.isArray(v) ? v.join(', ') || '—' : String(v)}
          </span>
        </li>
      ))}
    </ul>
  );
}


