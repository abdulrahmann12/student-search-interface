import * as XLSX from 'xlsx';
import { buildConflictReportRows, buildWorkspaceSummary, getStudentManualSelection } from './reconciliation';

function sanitizeFileName(value) {
  return String(value || 'workspace')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_');
}

export function exportReconciliationReport(workspace) {
  const summary = buildWorkspaceSummary(workspace);
  const reportRows = buildConflictReportRows(workspace).map((row) => ({
    'Student ID': row.studentId,
    'Student Name': row.studentName,
    'Conflict Status': row.status,
    'Reviewed At': row.reviewedAt,
    'System Courses': row.systemCourses,
    'Manual Courses': row.manualCourses,
    'Missing In System': row.missingInSystem,
    'Missing On Paper': row.missingOnPaper,
  }));
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.json_to_sheet([
    {
      Workspace: workspace?.name ?? 'Semester Workspace',
      'Source File': workspace?.fileName ?? '',
      'Total Students': summary.totalStudents,
      'Total Subjects': summary.totalSubjects,
      Reviewed: summary.reviewedCount,
      Matches: summary.matchCount,
      Conflicts: summary.conflictCount,
      Pending: summary.pendingCount,
    },
  ]);
  const reportSheet = XLSX.utils.json_to_sheet(reportRows);

  summarySheet['!cols'] = [
    { wch: 26 },
    { wch: 34 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];
  reportSheet['!cols'] = [
    { wch: 16 },
    { wch: 30 },
    { wch: 16 },
    { wch: 24 },
    { wch: 42 },
    { wch: 42 },
    { wch: 42 },
    { wch: 42 },
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(workbook, reportSheet, 'Reconciliation');
  XLSX.writeFile(workbook, `${sanitizeFileName(workspace?.name)}_reconciliation.xlsx`);
}

/**
 * Exports the "on paper" data for every student in the workspace.
 * The output mirrors the original upload format:
 *   - Row 1: top-level subject group labels (blank for fixed columns)
 *   - Row 2: column headers (Student ID / Name / Arabic Name / subject names)
 *   - Data rows: one row per student, subjects flagged from manual (paper) selections
 */
export function exportOnPaperData(workspace) {
  const students = workspace?.students ?? [];
  const subjectColumns = workspace?.subjectColumns ?? [];
  const manualSelections = workspace?.manualSelections ?? {};

  // ── Build header rows ──────────────────────────────────────────────────────
  const fixedHeaders = ['Student ID', 'Name', 'Arabic Name'];

  // Row 1: blank for fixed columns, then topLabel (group label) per subject
  const topRow = [
    ...fixedHeaders.map(() => ''),
    ...subjectColumns.map((col) => col.topLabel ?? ''),
  ];

  // Row 2: fixed labels, then the subject display names
  const bottomRow = [
    ...fixedHeaders,
    ...subjectColumns.map((col) => col.displayName ?? col.key),
  ];

  // ── Build data rows ────────────────────────────────────────────────────────
  const dataRows = students.map((student) => {
    const manualSelection = getStudentManualSelection(manualSelections, student.rowId);
    const manualKeySet = new Set(manualSelection.selectedCourseKeys ?? []);

    const subjectFlags = subjectColumns.map((col) => (manualKeySet.has(col.key) ? 1 : 0));

    return [student.id, student.name_en, student.name_ar, ...subjectFlags];
  });

  // ── Assemble sheet ─────────────────────────────────────────────────────────
  const sheetData = [topRow, bottomRow, ...dataRows];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths: fixed columns wider, subjects narrower
  sheet['!cols'] = [
    { wch: 16 },
    { wch: 30 },
    { wch: 30 },
    ...subjectColumns.map(() => ({ wch: 14 })),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'On Paper Data');
  XLSX.writeFile(workbook, `${sanitizeFileName(workspace?.name)}_on_paper.xlsx`);
}