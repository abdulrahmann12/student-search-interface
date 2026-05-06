import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ExcelUpload from './components/ExcelUpload';
import SearchInput from './components/SearchInput';
import SelectionControls from './components/SelectionControls';
import StudentCard from './components/StudentCard';
import StudentList from './components/StudentList';
import WorkspaceSidebar from './components/WorkspaceSidebar';
import { WorkspaceProvider, useWorkspaceContext } from './context/WorkspaceContext';
import useDebouncedValue from './hooks/useDebouncedValue';
import { exportReconciliationReport } from './utils/excel';
import { buildStudentReconciliation, buildWorkspaceSummary } from './utils/reconciliation';
import { filterStudents } from './utils/students';

function deriveWorkspaceName(fileName) {
  const normalized = String(fileName || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  return normalized || 'Semester Workspace';
}

function createEmptySummary() {
  return {
    totalStudents: 0,
    totalSubjects: 0,
    reviewedCount: 0,
    matchCount: 0,
    conflictCount: 0,
    pendingCount: 0,
  };
}

function AppShell() {
  const { activeWorkspace, workspaces, actions, isHydrated, persistenceError } =
    useWorkspaceContext();
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingFileName, setPendingFileName] = useState('');
  const [highlightedStudentRowId, setHighlightedStudentRowId] = useState(null);
  const workerRef = useRef(null);
  const latestParseIdRef = useRef(0);
  const pendingWorkspaceNameRef = useRef('');
  const pendingFileNameRef = useRef('');
  const searchInputRef = useRef(null);
  const detailPanelRef = useRef(null);
  const courseCheckboxRefs = useRef([]);
  const debouncedQuery = useDebouncedValue(
    activeWorkspace?.searchQuery ?? '',
    250,
    activeWorkspace?.id ?? 'no-workspace',
  );

  useEffect(() => {
    const worker = new Worker(new URL('./workers/excelParser.worker.js', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    const handleWorkerMessage = (event) => {
      const { type, payload, error: workerError, parseId } = event.data ?? {};

      if (parseId !== latestParseIdRef.current) {
        return;
      }

      if (type === 'success') {
        actions.createWorkspace({
          ...payload,
          fileName: pendingFileNameRef.current,
          name: pendingWorkspaceNameRef.current,
        });
        setError('');
        setIsParsing(false);
        setPendingFileName('');
        pendingFileNameRef.current = '';
        pendingWorkspaceNameRef.current = '';
        return;
      }

      if (type === 'error') {
        setError(workerError || 'Unable to parse the selected workbook.');
        setIsParsing(false);
        setPendingFileName('');
      }
    };

    worker.addEventListener('message', handleWorkerMessage);

    return () => {
      worker.removeEventListener('message', handleWorkerMessage);
      worker.terminate();
    };
  }, [actions]);

  const filteredStudents = useMemo(() => {
    if (!activeWorkspace) {
      return [];
    }

    return filterStudents(activeWorkspace.students, {}, debouncedQuery);
  }, [activeWorkspace, debouncedQuery]);

  const reconciliationByRowId = useMemo(() => {
    if (!activeWorkspace) {
      return {};
    }

    return Object.fromEntries(
      activeWorkspace.students.map((student) => [
        student.rowId,
        buildStudentReconciliation(
          student,
          activeWorkspace.subjectColumns,
          activeWorkspace.manualSelections,
        ),
      ]),
    );
  }, [activeWorkspace]);

  const workspaceSummary = useMemo(
    () => (activeWorkspace ? buildWorkspaceSummary(activeWorkspace) : createEmptySummary()),
    [activeWorkspace],
  );

  const workspaceSummaries = useMemo(
    () =>
      Object.fromEntries(
        workspaces.map((workspace) => [workspace.id, buildWorkspaceSummary(workspace)]),
      ),
    [workspaces],
  );

  const activeStudent = useMemo(() => {
    if (!activeWorkspace?.selectedStudentRowId) {
      return null;
    }

    return (
      activeWorkspace.students.find(
        (student) => student.rowId === activeWorkspace.selectedStudentRowId,
      ) ?? null
    );
  }, [activeWorkspace]);

  const activeReconciliation = activeStudent
    ? reconciliationByRowId[activeStudent.rowId] ?? null
    : null;

  useEffect(() => {
    courseCheckboxRefs.current = [];
  }, [activeStudent?.rowId, activeWorkspace?.id]);

  useEffect(() => {
    if (!activeWorkspace || !filteredStudents.length) {
      setHighlightedStudentRowId(null);
      return;
    }

    if (filteredStudents.some((student) => student.rowId === highlightedStudentRowId)) {
      return;
    }

    if (
      filteredStudents.some((student) => student.rowId === activeWorkspace.selectedStudentRowId)
    ) {
      setHighlightedStudentRowId(activeWorkspace.selectedStudentRowId);
      return;
    }

    setHighlightedStudentRowId(filteredStudents[0].rowId);
  }, [activeWorkspace, filteredStudents, highlightedStudentRowId]);

  useEffect(() => {
    if (!activeWorkspace || !filteredStudents.length) {
      return;
    }

    if (
      filteredStudents.some((student) => student.rowId === activeWorkspace.selectedStudentRowId)
    ) {
      return;
    }

    actions.setSelectedStudent(activeWorkspace.id, filteredStudents[0].rowId);
  }, [actions, activeWorkspace, filteredStudents]);

  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }, []);

  const focusCourseCheckbox = useCallback((targetIndex = 0) => {
    const inputs = courseCheckboxRefs.current.filter(Boolean);

    if (!inputs.length) {
      return false;
    }

    const nextIndex = ((targetIndex % inputs.length) + inputs.length) % inputs.length;
    inputs[nextIndex].focus();
    return true;
  }, []);

  const moveCourseFocus = useCallback((delta) => {
    const inputs = courseCheckboxRefs.current.filter(Boolean);

    if (!inputs.length) {
      return;
    }

    const activeElement = document.activeElement;
    const currentIndex = inputs.findIndex((input) => input === activeElement);
    const nextIndex =
      currentIndex === -1
        ? delta > 0
          ? 0
          : inputs.length - 1
        : (currentIndex + delta + inputs.length) % inputs.length;

    inputs[nextIndex].focus();
  }, []);

  const handleFileSelect = useCallback(async (file) => {
    if (!/\.xlsx?$/i.test(file.name)) {
      setError('Please upload a valid Excel workbook (.xlsx or .xls).');
      return;
    }

    if (!workerRef.current) {
      setError('The parser is not ready yet. Please try again.');
      return;
    }

    const parseId = latestParseIdRef.current + 1;
    latestParseIdRef.current = parseId;
    pendingWorkspaceNameRef.current = deriveWorkspaceName(file.name);
    pendingFileNameRef.current = file.name;
    setPendingFileName(file.name);
    setError('');
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      workerRef.current.postMessage({ buffer, parseId }, [buffer]);
    } catch (caughtError) {
      setIsParsing(false);
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unable to read the selected workbook.',
      );
    }
  }, []);

  const handleToggleCourse = useCallback(
    (courseKey) => {
      if (!activeWorkspace || !activeStudent) {
        return;
      }

      actions.toggleManualCourse(activeWorkspace.id, activeStudent.rowId, courseKey);
    },
    [actions, activeStudent, activeWorkspace],
  );

  const handleSaveCurrent = useCallback(() => {
    if (!activeWorkspace || !activeStudent) {
      return;
    }

    actions.saveStudentReview(activeWorkspace.id, activeStudent.rowId);
    focusSearch();
  }, [actions, activeStudent, activeWorkspace, focusSearch]);

  const handleResetCurrent = useCallback(() => {
    if (!activeWorkspace || !activeStudent) {
      return;
    }

    actions.resetStudentReview(activeWorkspace.id, activeStudent.rowId);
    focusCourseCheckbox(0);
  }, [actions, activeStudent, activeWorkspace, focusCourseCheckbox]);

  const handleExport = useCallback(async () => {
    if (!activeWorkspace) {
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      exportReconciliationReport(activeWorkspace);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to export the reconciliation report.',
      );
    } finally {
      setIsExporting(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        if (activeStudent) {
          event.preventDefault();
          handleSaveCurrent();
        }

        return;
      }

      if (!activeWorkspace || !filteredStudents.length) {
        return;
      }

      const activeElement = document.activeElement;
      const isSearchFocused = activeElement === searchInputRef.current;
      const isCourseFocused =
        activeElement instanceof HTMLElement && activeElement.dataset.courseToggle === 'true';
      const isDetailFocused = detailPanelRef.current?.contains(activeElement);
      const isTypingField =
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement instanceof HTMLInputElement &&
          activeElement !== searchInputRef.current &&
          activeElement.type !== 'checkbox') ||
        activeElement?.isContentEditable;

      if (
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
        (isSearchFocused || !isTypingField)
      ) {
        event.preventDefault();

        const currentIndex = filteredStudents.findIndex(
          (student) => student.rowId === highlightedStudentRowId,
        );
        const safeIndex = currentIndex === -1 ? 0 : currentIndex;
        const nextIndex =
          event.key === 'ArrowDown'
            ? Math.min(safeIndex + 1, filteredStudents.length - 1)
            : Math.max(safeIndex - 1, 0);

        setHighlightedStudentRowId(filteredStudents[nextIndex].rowId);
        return;
      }

      if (
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key === 'Enter' &&
        (isSearchFocused || activeElement === document.body)
      ) {
        event.preventDefault();
        const targetRowId = highlightedStudentRowId ?? filteredStudents[0]?.rowId;

        if (!targetRowId) {
          return;
        }

        actions.setSelectedStudent(activeWorkspace.id, targetRowId);
        requestAnimationFrame(() => {
          focusCourseCheckbox(0);
        });
        return;
      }

      if (
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key === 'Tab' &&
        activeStudent &&
        courseCheckboxRefs.current.filter(Boolean).length &&
        (isSearchFocused || isCourseFocused || isDetailFocused || activeElement === document.body)
      ) {
        event.preventDefault();
        moveCourseFocus(event.shiftKey ? -1 : 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    actions,
    activeStudent,
    activeWorkspace,
    filteredStudents,
    focusCourseCheckbox,
    handleSaveCurrent,
    highlightedStudentRowId,
    moveCourseFocus,
  ]);

  const subjectPreview = activeWorkspace?.subjectColumns ?? [];
  const currentFileName = pendingFileName || activeWorkspace?.fileName || '';

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-base font-bold text-ink">Student Registration Reconciliation</h1>
            <p className="text-sm text-muted">Review paper forms against the system workbook</p>
          </div>
          {!isHydrated ? (
            <span className="rounded-[10px] bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
              Restoring workspaces...
            </span>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 pb-14 pt-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <ExcelUpload
            onFileSelect={handleFileSelect}
            isLoading={isParsing}
            fileName={currentFileName}
            error={error}
          />

          <WorkspaceSidebar
            isHydrated={isHydrated}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspace?.id ?? null}
            workspaceSummaries={workspaceSummaries}
            onSelectWorkspace={actions.setActiveWorkspace}
            onRemoveWorkspace={actions.removeWorkspace}
            persistenceError={persistenceError}
          />

          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              Workspace Snapshot
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[10px] bg-slate-50 p-4">
                <p className="text-sm text-muted">Students</p>
                <p className="mt-1 text-2xl font-bold text-ink">{workspaceSummary.totalStudents}</p>
              </div>
              <div className="rounded-[10px] bg-slate-50 p-4">
                <p className="text-sm text-muted">Courses</p>
                <p className="mt-1 text-2xl font-bold text-ink">{workspaceSummary.totalSubjects}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Course Preview
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {subjectPreview.length ? (
                  <>
                    {subjectPreview.slice(0, 8).map((subject) => (
                      <span key={subject.key} className="subject-pill">
                        {subject.displayName}
                      </span>
                    ))}
                    {subjectPreview.length > 8 ? (
                      <span className="rounded-[10px] bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        +{subjectPreview.length - 8} more
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="rounded-[10px] bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Upload a workbook to preview courses.
                  </span>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <SearchInput
            inputRef={searchInputRef}
            query={activeWorkspace?.searchQuery ?? ''}
            onQueryChange={(nextQuery) => {
              if (activeWorkspace) {
                actions.setSearchQuery(activeWorkspace.id, nextQuery);
              }
            }}
            disabled={!activeWorkspace || isParsing}
            resultCount={filteredStudents.length}
            totalStudents={workspaceSummary.totalStudents}
            reviewedCount={workspaceSummary.reviewedCount}
            conflictCount={workspaceSummary.conflictCount}
            pendingCount={workspaceSummary.pendingCount}
            fileName={activeWorkspace?.fileName ?? ''}
            subjectCount={workspaceSummary.totalSubjects}
            workspaceName={activeWorkspace?.name ?? ''}
            isLoading={isParsing}
          />

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="card p-4">
              <p className="text-sm text-muted">Matches</p>
              <p className="mt-1 text-2xl font-bold text-ink">{workspaceSummary.matchCount}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-muted">Conflicts</p>
              <p className="mt-1 text-2xl font-bold text-ink">{workspaceSummary.conflictCount}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-muted">Pending review</p>
              <p className="mt-1 text-2xl font-bold text-ink">{workspaceSummary.pendingCount}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-muted">Workspaces saved</p>
              <p className="mt-1 text-2xl font-bold text-ink">{workspaces.length}</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
            <StudentList
              students={filteredStudents}
              isLoading={isParsing}
              hasDataset={Boolean(activeWorkspace)}
              query={debouncedQuery}
              activeStudentRowId={activeWorkspace?.selectedStudentRowId ?? null}
              highlightedStudentRowId={highlightedStudentRowId}
              onSelectStudent={(rowId) => {
                if (!activeWorkspace) {
                  return;
                }

                actions.setSelectedStudent(activeWorkspace.id, rowId);
                setHighlightedStudentRowId(rowId);
              }}
              onHighlightStudent={setHighlightedStudentRowId}
              reconciliationByRowId={reconciliationByRowId}
            />

            <div className="space-y-6">
              <SelectionControls
                hasWorkspace={Boolean(activeWorkspace)}
                activeStudent={activeStudent}
                reconciliation={activeReconciliation}
                reviewedCount={workspaceSummary.reviewedCount}
                conflictCount={workspaceSummary.conflictCount}
                pendingCount={workspaceSummary.pendingCount}
                onSaveCurrent={handleSaveCurrent}
                onResetCurrent={handleResetCurrent}
                onExport={handleExport}
                isExporting={isExporting}
              />

              <StudentCard
                panelRef={detailPanelRef}
                student={activeStudent}
                query={debouncedQuery}
                subjectColumns={activeWorkspace?.subjectColumns ?? []}
                reconciliation={activeReconciliation}
                onToggleCourse={handleToggleCourse}
                checkboxRefs={courseCheckboxRefs}
              />
            </div>
          </div>
        </section>
      </div>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <AppShell />
    </WorkspaceProvider>
  );
}