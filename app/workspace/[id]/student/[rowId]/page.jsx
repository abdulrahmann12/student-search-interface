'use client';

import StudentCard from '@/src/components/StudentCard';
import { useWorkspaceContext } from '@/src/context/WorkspaceContext';
import { exportReconciliationReport } from '@/src/utils/excel';
import { buildStudentReconciliation, buildWorkspaceSummary } from '@/src/utils/reconciliation';
import { getStudentDisplayName } from '@/src/utils/students';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function StudentDetailPage() {
  const { id, rowId } = useParams();
  const router = useRouter();
  const { workspaces, actions, isHydrated } = useWorkspaceContext();
  const courseCheckboxRefs = useRef([]);
  const panelRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const workspace = useMemo(
    () => workspaces.find((w) => w.id === id) ?? null,
    [workspaces, id],
  );

  const student = useMemo(
    () => workspace?.students.find((s) => s.rowId === rowId) ?? null,
    [workspace, rowId],
  );

  const studentIndex = useMemo(
    () => (workspace ? workspace.students.findIndex((s) => s.rowId === rowId) : -1),
    [workspace, rowId],
  );

  const prevStudent = studentIndex > 0 ? workspace.students[studentIndex - 1] : null;
  const nextStudent =
    studentIndex >= 0 && studentIndex < (workspace?.students.length ?? 0) - 1
      ? workspace.students[studentIndex + 1]
      : null;

  // Sync active workspace + selected student in context
  useEffect(() => {
    if (id) actions.setActiveWorkspace(id);
  }, [id, actions]);

  useEffect(() => {
    if (id && rowId) actions.setSelectedStudent(id, rowId);
  }, [id, rowId, actions]);

  // Redirect if not found after hydration
  useEffect(() => {
    if (isHydrated && !workspace) router.replace('/');
    else if (isHydrated && workspace && !student) router.replace(`/workspace/${id}`);
  }, [isHydrated, workspace, student, id, router]);

  const reconciliation = useMemo(() => {
    if (!workspace || !student) return null;
    return buildStudentReconciliation(
      student,
      workspace.subjectColumns,
      workspace.manualSelections,
    );
  }, [workspace, student]);

  const summary = useMemo(
    () => (workspace ? buildWorkspaceSummary(workspace) : null),
    [workspace],
  );

  // Reset checkbox refs when student changes
  useEffect(() => {
    courseCheckboxRefs.current = [];
  }, [rowId]);

  const handleToggleCourse = useCallback(
    (courseKey) => {
      if (!workspace || !student) return;
      actions.toggleManualCourse(workspace.id, student.rowId, courseKey);
    },
    [actions, student, workspace],
  );

  const handleSave = useCallback(() => {
    if (!workspace || !student) return;
    actions.saveStudentReview(workspace.id, student.rowId);
  }, [actions, student, workspace]);

  const handleReset = useCallback(() => {
    if (!workspace || !student) return;
    actions.resetStudentReview(workspace.id, student.rowId);
    const inputs = courseCheckboxRefs.current.filter(Boolean);
    if (inputs.length) inputs[0].focus();
  }, [actions, student, workspace]);

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

  // Keyboard: Ctrl+S saves, Tab moves through course checkboxes
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        if (student) {
          event.preventDefault();
          handleSave();
        }
        return;
      }

      const inputs = courseCheckboxRefs.current.filter(Boolean);
      if (!inputs.length) return;

      const activeEl = document.activeElement;
      const isCourseFocused =
        activeEl instanceof HTMLElement && activeEl.dataset.courseToggle === 'true';
      const isPanelFocused = panelRef.current?.contains(activeEl);

      if (
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key === 'Tab' &&
        (isCourseFocused || isPanelFocused)
      ) {
        event.preventDefault();
        const currentIndex = inputs.findIndex((i) => i === activeEl);
        const nextIndex =
          currentIndex === -1
            ? event.shiftKey
              ? inputs.length - 1
              : 0
            : (currentIndex + (event.shiftKey ? -1 : 1) + inputs.length) % inputs.length;
        inputs[nextIndex].focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, student]);

  if (!isHydrated || !workspace || !student) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted">Loading student...</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => router.push(`/workspace/${id}`)}
          className="btn-secondary"
        >
          ← Back
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Ctrl+S to save</span>
          <button type="button" onClick={handleSave} className="btn-primary">
            Save
          </button>
          <button type="button" onClick={handleReset} className="btn-secondary">
            Reset
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="btn-secondary"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Progress stats inline bar */}
      {summary ? (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="card p-3">
            <p className="text-xs font-semibold uppercase text-muted">Reviewed</p>
            <p className="mt-0.5 text-xl font-bold text-ink">{summary.reviewedCount}</p>
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
      ) : null}

      {/* Student card */}
      <StudentCard
        panelRef={panelRef}
        student={student}
        query=""
        subjectColumns={workspace.subjectColumns ?? []}
        reconciliation={reconciliation}
        onToggleCourse={handleToggleCourse}
        checkboxRefs={courseCheckboxRefs}
      />

      {/* Prev / Next navigation */}
      <div className="mt-3 flex items-center justify-between gap-4">
        {prevStudent ? (
          <button
            type="button"
            onClick={() => router.push(`/workspace/${id}/student/${prevStudent.rowId}`)}
            className="btn-secondary"
          >
            ← {getStudentDisplayName(prevStudent) || prevStudent.id}
          </button>
        ) : (
          <span />
        )}

        <span className="text-xs text-muted">
          {studentIndex + 1} / {workspace.students.length}
        </span>

        {nextStudent ? (
          <button
            type="button"
            onClick={() => router.push(`/workspace/${id}/student/${nextStudent.rowId}`)}
            className="btn-secondary"
          >
            {getStudentDisplayName(nextStudent) || nextStudent.id} →
          </button>
        ) : (
          <span />
        )}
      </div>
    </main>
  );
}
