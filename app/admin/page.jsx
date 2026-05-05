'use client';

import { ActivityLogs, UserManager } from '@/src/components/AdminUserManager';
import WorkspaceAssigner from '@/src/components/WorkspaceAssigner';
import { useState } from 'react';

const TABS = [
  { key: 'users',      label: 'User Accounts'      },
  { key: 'workspaces', label: 'Workspace Access'    },
  { key: 'logs',       label: 'Activity Logs'       },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <main className="mx-auto max-w-[1200px] px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Admin Panel</h1>
        <p className="mt-1 text-sm text-muted">
          Manage user accounts, workspace access, and review system activity logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              'rounded-t-[8px] px-4 py-2.5 text-sm font-semibold transition',
              activeTab === tab.key
                ? 'border-b-2 border-teal-600 text-teal-700'
                : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users'      && <UserManager />}
      {activeTab === 'workspaces' && <WorkspaceAssigner />}
      {activeTab === 'logs'       && <ActivityLogs />}
    </main>
  );
}

