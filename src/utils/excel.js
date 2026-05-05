import * as XLSX from 'xlsx';
import { buildConflictReportRows, buildWorkspaceSummary } from './reconciliation';

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