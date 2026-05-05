import * as XLSX from 'xlsx';
import {
    buildExportColumns,
    buildStudentRecord,
    coerceDisplayValue,
    getSubjectColumns,
    isEmptyRow,
    resolveFixedColumnKey
} from '../utils/students';

function findHeaderRowIndex(rows) {
  const candidateRows = rows.slice(0, 5);
  let bestIndex = 0;
  let bestScore = -1;

  candidateRows.forEach((row, index) => {
    const score = row.reduce(
      (count, cell) => count + (resolveFixedColumnKey(cell) ? 1 : 0),
      0,
    );

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function createRecordFromRow(exportColumns, row) {
  return exportColumns.reduce((accumulator, column) => {
    accumulator[column.key] = row[column.index] ?? '';
    return accumulator;
  }, {});
}

self.onmessage = (event) => {
  try {
    const { buffer, parseId } = event.data;
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error('The workbook does not contain any sheets.');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: true,
      defval: '',
    });
    const headerRowIndex = findHeaderRowIndex(rows);
    const headerRow = rows[headerRowIndex] ?? [];
    const supplementalHeaderRow = headerRowIndex > 0 ? rows[headerRowIndex - 1] ?? [] : [];
    const exportColumns = buildExportColumns(headerRow, supplementalHeaderRow);

    if (!exportColumns.length) {
      throw new Error('The first row must contain the column headers.');
    }

    const requiredHeaders = ['id', 'name_en', 'name_ar'];

    for (const header of requiredHeaders) {
      if (!exportColumns.some((column) => column.key === header)) {
        throw new Error(`Missing required column: ${header}`);
      }
    }

    const students = rows
      .slice(headerRowIndex + 1)
      .map((row) => createRecordFromRow(exportColumns, row))
      .filter((record) => !isEmptyRow(record))
      .map((record, index) => buildStudentRecord(record, exportColumns, index));

    const headerRows = [
      ...(headerRowIndex > 0
        ? [exportColumns.map((column) => coerceDisplayValue(supplementalHeaderRow[column.index]))]
        : []),
      exportColumns.map(
        (column) => coerceDisplayValue(headerRow[column.index]) || column.bottomLabel || column.displayName,
      ),
    ];

    self.postMessage({
      type: 'success',
      parseId,
      payload: {
        exportColumns,
        headerRows,
        subjectColumns: getSubjectColumns(exportColumns),
        students,
      },
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      parseId: event.data?.parseId,
      error: error instanceof Error ? error.message : 'Unable to parse the Excel file.',
    });
  }
};
