'use client';

import SearchInput from '@/src/components/SearchInput';
import StudentList from '@/src/components/StudentList';
import { useWorkspaceContext } from '@/src/context/WorkspaceContext';
import useDebouncedValue from '@/src/hooks/useDebouncedValue';
import { exportReconciliationReport } from '@/src/utils/excel';
import { buildStudentReconciliation, buildWorkspaceSummary } from '@/src/utils/reconciliation';
import { filterStudents } from '@/src/utils/students';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const EMPTY_SUMMARY = {
  totalStudents: 0,
  totalSubjects: 0,
  reviewedCount: 0,
  matchCount: 0,
  conflictCount: 0,
  pendingCount: 0,
};

export default function WorkspacePage() {
  const { id } = useParams();
  const router = useRouter();
  const { workspaces, actions, isHydrated } = useWorkspaceContext();
  const [isExporting, setIsExporting] = useState(false);
  const [highlightedRowId, setHighlightedRowId] = useState(null);
  const searchInputRef = useRef(null);

  const workspace = useMemo(
    () => workspaces.find((w) => w.id === id) ?? null,
    [workspaces, id],
  );

  // Sync active workspace in context
  useEffect(() => {
    if (id) actions.setActiveWorkspace(id);
  }, [id, actions]);

  // Redirect to home if workspace not found after hydration
  useEffect(() => {
    if (isHydrated && !workspace) router.replace('/');
  }, [isHydrated, workspace, router]);

  const debouncedQuery = useDebouncedValue(
    workspace?.searchQuery ?? '',
    250,
    workspace?.id ?? 'no-workspace',
  );

  const filteredStudents = useMemo(
    () => (workspace ? filterStudents(workspace.students, {}, debouncedQuery) : []),
    [workspace, debouncedQuery],
  );

  // Compute reconciliations only for visible (filtered) students to avoid an
  // O(all-students) pass on every render.
  const reconciliationByRowId = useMemo(() => {
    if (!workspace) return {};
    return Object.fromEntries(
      filteredStudents.map((student) => [
        student.rowId,
        buildStudentReconciliation(
          student,
          workspace.subjectColumns,
          workspace.manualSelections,
        ),
      ]),
    );
  }, [filteredStudents, workspace]);

  const summary = useMemo(
    () => (workspace ? buildWorkspaceSummary(workspace) : EMPTY_SUMMARY),
    [workspace],
  );

  // Keep highlighted row in sync with filtered list
  useEffect(() => {
    if (!filteredStudents.length) {
      setHighlightedRowId(null);
      return;
    }
    if (filteredStudents.some((s) => s.rowId === highlightedRowId)) return;

    const fallback =
      workspace?.selectedStudentRowId &&
      filteredStudents.some((s) => s.rowId === workspace.selectedStudentRowId)
        ? workspace.selectedStudentRowId
        : filteredStudents[0].rowId;
    setHighlightedRowId(fallback);
  }, [filteredStudents, highlightedRowId, workspace?.selectedStudentRowId]);

  // Keyboard: arrows navigate the list, Enter opens student detail
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!filteredStudents.length) return;

      const activeEl = document.activeElement;
      const isSearchFocused = activeEl === searchInputRef.current;
      const isBodyFocused = activeEl === document.body;

      if (
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
        (isSearchFocused || isBodyFocused)
      ) {
        event.preventDefault();
        const currentIndex = filteredStudents.findIndex((s) => s.rowId === highlightedRowId);
        const safeIndex = currentIndex === -1 ? 0 : currentIndex;
        const nextIndex =
          event.key === 'ArrowDown'
            ? Math.min(safeIndex + 1, filteredStudents.length - 1)
            : Math.max(safeIndex - 1, 0);
        setHighlightedRowId(filteredStudents[nextIndex].rowId);
        return;
      }

      if (
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key === 'Enter' &&
        (isSearchFocused || isBodyFocused)
      ) {
        event.preventDefault();
        const targetRowId = highlightedRowId ?? filteredStudents[0]?.rowId;
        if (targetRowId && id) {
          actions.setSelectedStudent(id, targetRowId);
          router.push(`/workspace/${id}/student/${targetRowId}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredStudents, highlightedRowId, id, router, actions]);

  const handleExport = useCallback(async () => {
    if (!workspace) return;
    setIsExporting(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      exportReconciliationReport(workspace);
    } finally {
      setIsExporting(false);
    }
  }, [workspace]);

  if (!isHydrated || !workspace) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted">Loading workspace...</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      {/* Title + export */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-ink">{workspace.name}</h1>
          {workspace.fileName ? (
            <p className="mt-0.5 text-xs text-muted">{workspace.fileName}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="btn-secondary flex-shrink-0"
        >
          {isExporting ? 'Exporting...' : 'Export Report'}
        </button>
      </div>

      {/* Stats bar */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-3">
          <p className="text-xs font-semibold uppercase text-muted">Total</p>
          <p className="mt-0.5 text-xl font-bold text-ink">{summary.totalStudents}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs font-semibold uppercase text-muted">Matches</p>
          <p className="mt-0.5 text-xl font-bold text-emerald-700">{summary.matchCount}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs font-semibold uppercase text-muted">Conflicts</p>
          <p className="mt-0.5 text-xl font-bold text-amber-600">{summary.conflictCount}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs font-semibold uppercase text-muted">Pending</p>
          <p className="mt-0.5 text-xl font-bold text-ink">{summary.pendingCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3">
        <SearchInput
          inputRef={searchInputRef}
          query={workspace.searchQuery}
          onQueryChange={(q) => actions.setSearchQuery(workspace.id, q)}
          resultCount={filteredStudents.length}
          totalStudents={summary.totalStudents}
          reviewedCount={summary.reviewedCount}
          conflictCount={summary.conflictCount}
          pendingCount={summary.pendingCount}
          subjectCount={summary.totalSubjects}
        />
      </div>

      {/* Student list */}
      <StudentList
        students={filteredStudents}
        isLoading={false}
        hasDataset
        query={debouncedQuery}
        activeStudentRowId={workspace.selectedStudentRowId ?? null}
        highlightedStudentRowId={highlightedRowId}
        onSelectStudent={(rowId) => {
          actions.setSelectedStudent(workspace.id, rowId);
          router.push(`/workspace/${id}/student/${rowId}`);
        }}
        onHighlightStudent={setHighlightedRowId}
        reconciliationByRowId={reconciliationByRowId}
      />
    </main>
  );
}
