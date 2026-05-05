import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ExcelUpload from './components/ExcelUpload';
import SearchInput from './components/SearchInput';
import SelectionControls from './components/SelectionControls';
import StudentList from './components/StudentList';
import ThemeToggle from './components/ThemeToggle';
import useDebouncedValue from './hooks/useDebouncedValue';
import { exportStudentsToExcel } from './utils/excel';
import { countSelectedStudents, filterStudents } from './utils/students';

const THEME_STORAGE_KEY = 'student-search-theme';

function getInitialTheme() {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [students, setStudents] = useState([]);
  const [exportColumns, setExportColumns] = useState([]);
  const [headerRows, setHeaderRows] = useState([]);
  const [subjectColumns, setSubjectColumns] = useState([]);
  const [modifications, setModifications] = useState({});
  const [query, setQuery] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const workerRef = useRef(null);
  const latestParseIdRef = useRef(0);

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

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
        setStudents(payload.students);
        setExportColumns(payload.exportColumns);
        setHeaderRows(payload.headerRows);
        setSubjectColumns(payload.subjectColumns);
        setModifications({});
        setError('');
        setIsParsing(false);
        return;
      }

      if (type === 'error') {
        setStudents([]);
        setExportColumns([]);
        setHeaderRows([]);
        setSubjectColumns([]);
        setModifications({});
        setError(workerError || 'Unable to parse the selected workbook.');
        setIsParsing(false);
      }
    };

    worker.addEventListener('message', handleWorkerMessage);

    return () => {
      worker.removeEventListener('message', handleWorkerMessage);
      worker.terminate();
    };
  }, []);

  const filteredStudents = useMemo(
    () => filterStudents(students, modifications, debouncedQuery),
    [students, modifications, debouncedQuery],
  );

  const selectedCount = useMemo(
    () => countSelectedStudents(students, modifications),
    [students, modifications],
  );

  const allVisibleSelected = useMemo(
    () => filteredStudents.length > 0 && filteredStudents.every((student) => student.checked),
    [filteredStudents],
  );

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

    setFileName(file.name);
    setQuery('');
    setError('');
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      workerRef.current.postMessage({ buffer, parseId }, [buffer]);
    } catch (caughtError) {
      setIsParsing(false);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to read the selected workbook.',
      );
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleToggleStudent = useCallback((rowId, checked) => {
    setModifications((current) => ({
      ...current,
      [rowId]: {
        ...current[rowId],
        checked,
      },
    }));
  }, []);

  const handleToggleVisible = useCallback(() => {
    setModifications((current) => {
      const nextChecked = !allVisibleSelected;
      const nextState = { ...current };

      filteredStudents.forEach((student) => {
        nextState[student.rowId] = {
          ...nextState[student.rowId],
          checked: nextChecked,
        };
      });

      return nextState;
    });
  }, [allVisibleSelected, filteredStudents]);

  const handleClearAll = useCallback(() => {
    setModifications({});
  }, []);

  const handleExport = useCallback(async () => {
    if (!students.length) {
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      exportStudentsToExcel({ students, modifications, exportColumns, headerRows });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to export the updated workbook.',
      );
    } finally {
      setIsExporting(false);
    }
  }, [students, modifications, exportColumns, headerRows]);

  return (
    <main className="relative mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6 lg:px-8">
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-white/35 to-transparent dark:from-white/5" />

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">
            Student Registry
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-ink sm:text-5xl">
            Search, select, and export with clarity.
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted sm:text-lg">
            Upload an Excel workbook, search instantly across ID and multilingual names, review subject registrations, and export a clean updated file with checked rows.
          </p>
        </div>

        <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
      </header>

      <section className="mb-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel surface-ring overflow-hidden rounded-[36px] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-accentSoft px-4 py-2 text-sm font-semibold text-accent">
              Debounced search
            </span>
            <span className="rounded-full bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/70 dark:text-slate-100">
              Worker-backed parsing
            </span>
            <span className="rounded-full bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/70 dark:text-slate-100">
              Excel export
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] bg-white/70 p-5 dark:bg-slate-950/30">
              <p className="text-sm text-muted">Students loaded</p>
              <p className="mt-2 text-3xl font-bold text-ink">{students.length}</p>
            </div>
            <div className="rounded-[28px] bg-white/70 p-5 dark:bg-slate-950/30">
              <p className="text-sm text-muted">Subjects detected</p>
              <p className="mt-2 text-3xl font-bold text-ink">{subjectColumns.length}</p>
            </div>
            <div className="rounded-[28px] bg-white/70 p-5 dark:bg-slate-950/30">
              <p className="text-sm text-muted">Selected students</p>
              <p className="mt-2 text-3xl font-bold text-ink">{selectedCount}</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              Subject preview
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {subjectColumns.length ? (
                <>
                  {subjectColumns.slice(0, 10).map((subject) => (
                    <span key={subject} className="subject-pill">
                      {subject}
                    </span>
                  ))}
                  {subjectColumns.length > 10 ? (
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      +{subjectColumns.length - 10} more
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Subject columns appear here after upload.
                </span>
              )}
            </div>
          </div>
        </div>

        <ExcelUpload
          onFileSelect={handleFileSelect}
          isLoading={isParsing}
          fileName={fileName}
          error={error}
        />
      </section>

      <SearchInput
        query={query}
        onQueryChange={setQuery}
        disabled={!students.length || isParsing}
        resultCount={filteredStudents.length}
        totalStudents={students.length}
        selectedCount={selectedCount}
        fileName={fileName}
        subjectCount={subjectColumns.length}
        isLoading={isParsing}
      />

      <SelectionControls
        visibleCount={filteredStudents.length}
        totalCount={students.length}
        selectedCount={selectedCount}
        allVisibleSelected={allVisibleSelected}
        onToggleVisible={handleToggleVisible}
        onClearAll={handleClearAll}
        onExport={handleExport}
        isExporting={isExporting}
      />

      <StudentList
        students={filteredStudents}
        isLoading={isParsing}
        hasDataset={students.length > 0}
        query={debouncedQuery}
        onToggleStudent={handleToggleStudent}
      />
    </main>
  );
}