import { getStudentDisplayName } from './students';

function sortCourseLabels(courseLabels) {
  return [...courseLabels].sort((left, right) => left.localeCompare(right));
}

export function getStudentManualSelection(manualSelections, rowId) {
  return manualSelections?.[rowId] ?? { selectedCourseKeys: [], reviewedAt: null };
}

export function buildStudentReconciliation(student, subjectColumns, manualSelections) {
  const manualSelection = getStudentManualSelection(manualSelections, student.rowId);
  const subjectLookup = new Map(subjectColumns.map((subject) => [subject.key, subject.displayName]));
  const systemCourseKeys = subjectColumns
    .filter((subject) => student.subjectFlags[subject.key] === 1)
    .map((subject) => subject.key);
  const manualCourseKeys = manualSelection.selectedCourseKeys ?? [];
  const systemKeySet = new Set(systemCourseKeys);
  const manualKeySet = new Set(manualCourseKeys);

  const manualCourses = sortCourseLabels(
    manualCourseKeys
      .map((courseKey) => subjectLookup.get(courseKey))
      .filter(Boolean),
  );
  const systemCourses = sortCourseLabels(
    systemCourseKeys
      .map((courseKey) => subjectLookup.get(courseKey))
      .filter(Boolean),
  );
  const missingInSystem = sortCourseLabels(
    manualCourseKeys
      .filter((courseKey) => !systemKeySet.has(courseKey))
      .map((courseKey) => subjectLookup.get(courseKey))
      .filter(Boolean),
  );
  const missingOnPaper = sortCourseLabels(
    systemCourseKeys
      .filter((courseKey) => !manualKeySet.has(courseKey))
      .map((courseKey) => subjectLookup.get(courseKey))
      .filter(Boolean),
  );

  const isReviewed = Boolean(manualSelection.reviewedAt);
  const hasConflict = isReviewed && (missingInSystem.length > 0 || missingOnPaper.length > 0);
  const status = !isReviewed ? 'Pending' : hasConflict ? 'Conflict' : 'Match';

  return {
    manualSelection,
    manualCourses,
    systemCourses,
    missingInSystem,
    missingOnPaper,
    status,
    hasConflict,
    isReviewed,
  };
}

export function buildWorkspaceSummary(workspace) {
  const students = workspace?.students ?? [];
  const subjectColumns = workspace?.subjectColumns ?? [];
  const manualSelections = workspace?.manualSelections ?? {};
  let reviewedCount = 0;
  let matchCount = 0;
  let conflictCount = 0;

  for (const student of students) {
    const selection = manualSelections[student.rowId];
    if (!selection?.reviewedAt) continue;
    reviewedCount += 1;

    const systemKeySet = new Set(
      subjectColumns.filter((s) => student.subjectFlags[s.key] === 1).map((s) => s.key),
    );
    const manualKeys = selection.selectedCourseKeys ?? [];
    const manualKeySet = new Set(manualKeys);
    const hasConflict =
      manualKeySet.size !== systemKeySet.size || manualKeys.some((k) => !systemKeySet.has(k));

    if (hasConflict) conflictCount += 1;
    else matchCount += 1;
  }

  return {
    totalStudents: students.length,
    totalSubjects: subjectColumns.length,
    reviewedCount,
    matchCount,
    conflictCount,
    pendingCount: students.length - reviewedCount,
  };
}

export function buildConflictReportRows(workspace) {
  const students = workspace?.students ?? [];
  const subjectColumns = workspace?.subjectColumns ?? [];
  const manualSelections = workspace?.manualSelections ?? {};

  return students.map((student) => {
    const reconciliation = buildStudentReconciliation(student, subjectColumns, manualSelections);

    return {
      studentId: student.id,
      studentName: getStudentDisplayName(student),
      status: reconciliation.status,
      reviewedAt: reconciliation.manualSelection.reviewedAt ?? '',
      systemCourses: reconciliation.systemCourses.join(', '),
      manualCourses: reconciliation.manualCourses.join(', '),
      missingInSystem: reconciliation.missingInSystem.join(', '),
      missingOnPaper: reconciliation.missingOnPaper.join(', '),
    };
  });
}