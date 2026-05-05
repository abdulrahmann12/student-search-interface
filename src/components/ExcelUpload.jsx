import { useCallback, useMemo, useRef, useState } from 'react';

const ACCEPTED_EXTENSIONS = '.xlsx,.xls';

export default function ExcelUpload({ onFileSelect, isLoading, fileName, error }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const helperText = useMemo(() => {
    if (isLoading) {
      return 'Parsing the system workbook and creating a new saved workspace...';
    }

    if (fileName) {
      return `${fileName} is loaded. Upload another sheet to create a separate semester workspace.`;
    }

    return 'Drop the system-generated Excel sheet here or choose it from disk.';
  }, [fileName, isLoading]);

  const processFileList = useCallback(
    (files) => {
      const nextFile = files?.[0];

      if (nextFile) {
        onFileSelect(nextFile);
      }
    },
    [onFileSelect],
  );

  const handleInputChange = useCallback(
    (event) => {
      processFileList(event.target.files);
      event.target.value = '';
    },
    [processFileList],
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragging(false);
      processFileList(event.dataTransfer.files);
    },
    [processFileList],
  );

  return (
    <div className="glass-panel surface-ring relative overflow-hidden rounded-[32px] p-6 sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-teal-200/30 dark:from-white/5 dark:to-teal-400/10" />
      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              System Data Intake
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Upload intersection sheet</h2>
          </div>
          <div className="rounded-full bg-accentSoft px-3 py-1 text-xs font-semibold text-accent">
            {isLoading ? 'Parsing' : 'Ready'}
          </div>
        </div>

        <div
          role="presentation"
          onDragEnter={() => setIsDragging(true)}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={[
            'rounded-[28px] border border-dashed px-5 py-10 text-center transition duration-200',
            isDragging
              ? 'border-accent bg-accentSoft/80'
              : 'border-line bg-white/55 dark:bg-slate-950/35',
          ].join(' ')}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white dark:bg-teal-400 dark:text-slate-950">
            XL
          </div>
          <p className="mt-5 text-lg font-semibold text-ink">
            {isLoading ? 'Reading workbook...' : 'Create a new semester workspace'}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">{helperText}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="btn-primary"
            >
              {fileName ? 'Upload another sheet' : 'Choose workbook'}
            </button>
            <span className="rounded-full border border-line px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              .xlsx / .xls
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
