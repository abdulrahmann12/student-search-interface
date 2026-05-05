import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ExcelUpload from './components/ExcelUpload';
import SearchInput from './components/SearchInput';
import SelectionControls from './components/SelectionControls';
import StudentCard from './components/StudentCard';
import StudentList from './components/StudentList';
import ThemeToggle from './components/ThemeToggle';
import WorkspaceSidebar from './components/WorkspaceSidebar';
import { WorkspaceProvider, useWorkspaceContext } from './context/WorkspaceContext';
import useDebouncedValue from './hooks/useDebouncedValue';
import { exportReconciliationReport } from './utils/excel';
import { buildStudentReconciliation, buildWorkspaceSummary } from './utils/reconciliation';
import { filterStudents } from './utils/students';

const THEME_STORAGE_KEY = 'student-search-theme';

function getPreferredTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

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

function AppShell({ theme, onToggleTheme }) {
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
    <main className="relative mx-auto max-w-[1500px] px-4 pb-14 pt-6 sm:px-6 lg:px-8">
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-white/35 to-transparent dark:from-white/5" />

      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">
            Student Registration Reconciliation
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-ink sm:text-5xl">
            Review paper forms against the system workbook.
          </h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-muted sm:text-lg">
            Upload a semester intersection sheet, restore saved workspaces on refresh, search students fast, compare the paper form to the system registration, and export a conflict-ready Excel report.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isHydrated ? (
            <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
              Restoring saved workspaces...
            </span>
          ) : null}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>

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

          <div className="glass-panel surface-ring rounded-[32px] p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              Workspace Snapshot
            </p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[24px] bg-white/70 p-4 dark:bg-slate-950/35">
                <p className="text-sm text-muted">Students loaded</p>
                <p className="mt-2 text-3xl font-bold text-ink">{workspaceSummary.totalStudents}</p>
              </div>
              <div className="rounded-[24px] bg-white/70 p-4 dark:bg-slate-950/35">
                <p className="text-sm text-muted">Semester courses</p>
                <p className="mt-2 text-3xl font-bold text-ink">{workspaceSummary.totalSubjects}</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Course Preview
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {subjectPreview.length ? (
                  <>
                    {subjectPreview.slice(0, 8).map((subject) => (
                      <span key={subject.key} className="subject-pill">
                        {subject.displayName}
                      </span>
                    ))}
                    {subjectPreview.length > 8 ? (
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        +{subjectPreview.length - 8} more
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Upload a workbook to preview course columns.
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
            <div className="glass-panel surface-ring rounded-[28px] p-5">
              <p className="text-sm text-muted">Matches</p>
              <p className="mt-2 text-3xl font-bold text-ink">{workspaceSummary.matchCount}</p>
            </div>
            <div className="glass-panel surface-ring rounded-[28px] p-5">
              <p className="text-sm text-muted">Conflicts</p>
              <p className="mt-2 text-3xl font-bold text-ink">{workspaceSummary.conflictCount}</p>
            </div>
            <div className="glass-panel surface-ring rounded-[28px] p-5">
              <p className="text-sm text-muted">Pending review</p>
              <p className="mt-2 text-3xl font-bold text-ink">{workspaceSummary.pendingCount}</p>
            </div>
            <div className="glass-panel surface-ring rounded-[28px] p-5">
              <p className="text-sm text-muted">Workspaces saved</p>
              <p className="mt-2 text-3xl font-bold text-ink">{workspaces.length}</p>
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
    </main>
  );
}

export default function App() {
  const [theme, setTheme] = useState('light');
  const [hasResolvedTheme, setHasResolvedTheme] = useState(false);

  useEffect(() => {
    setTheme(getPreferredTheme());
    setHasResolvedTheme(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');

    if (hasResolvedTheme) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [hasResolvedTheme, theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <WorkspaceProvider>
      <AppShell theme={theme} onToggleTheme={handleToggleTheme} />
    </WorkspaceProvider>
  );
}