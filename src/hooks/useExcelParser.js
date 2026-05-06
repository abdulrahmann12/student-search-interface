import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspaceContext } from '../context/WorkspaceContext';

function deriveWorkspaceName(fileName) {
  return (
    String(fileName || '')
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim() || 'Semester Workspace'
  );
}

export function useExcelParser() {
  const { actions } = useWorkspaceContext();
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  const [pendingFileName, setPendingFileName] = useState('');
  const workerRef = useRef(null);
  const latestParseIdRef = useRef(0);
  const pendingWorkspaceNameRef = useRef('');
  const pendingFileNameRef = useRef('');
  // Keep a stable ref to actions so the worker message handler never goes stale
  const actionsRef = useRef(actions);

  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  // Terminate the worker on unmount if it was ever created
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Create the worker the first time a file is selected, not on mount, so the
  // large xlsx module is not loaded until actually needed.
  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(
      new URL('../workers/excelParser.worker.js', import.meta.url),
      { type: 'module' },
    );

    worker.addEventListener('message', (event) => {
      const { type, payload, error: workerError, parseId } = event.data ?? {};

      if (parseId !== latestParseIdRef.current) {
        return;
      }

      if (type === 'success') {
        actionsRef.current.createWorkspace({
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
    });

    workerRef.current = worker;
    return worker;
  }, []);

  const parseFile = useCallback(async (file) => {
    if (!/\.xlsx?$/i.test(file.name)) {
      setError('Please upload a valid Excel workbook (.xlsx or .xls).');
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
      ensureWorker().postMessage({ buffer, parseId }, [buffer]);
    } catch (err) {
      setIsParsing(false);
      setError(err instanceof Error ? err.message : 'Unable to read the selected workbook.');
    }
  }, [ensureWorker]);

  return { isParsing, error, pendingFileName, parseFile };
}
