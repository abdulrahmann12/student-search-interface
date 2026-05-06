export const FIXED_COLUMNS = ['id', 'name_en', 'name_ar'];

const FIXED_COLUMN_ALIASES = {
  id: ['id', 'student id', 'student_id', 'studentid'],
  name_en: [
    'name',
    'name_en',
    'name en',
    'name english',
    'english name',
    'student name',
    'student name english',
    'student english name',
    'student_name',
    'student_name_english',
  ],
  name_ar: [
    'name_ar',
    'name ar',
    'arabic name',
    'student name arabic',
    'student arabic name',
    'student_name_arabic',
  ],
};

export function normalizeValue(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function coerceDisplayValue(value) {
  return String(value ?? '').trim();
}

export function resolveFixedColumnKey(headerValue) {
  const normalizedValue = normalizeValue(headerValue);

  return (
    FIXED_COLUMNS.find(
      (column) =>
        normalizedValue === column || FIXED_COLUMN_ALIASES[column].includes(normalizedValue),
    ) ?? null
  );
}

export function buildExportColumns(headerRow, supplementalHeaderRow = []) {
  return headerRow.reduce((columns, headerCell, index) => {
    const primaryLabel = coerceDisplayValue(headerCell);
    const supplementalLabel = coerceDisplayValue(supplementalHeaderRow[index]);
    const fixedColumnKey = resolveFixedColumnKey(primaryLabel || supplementalLabel);
    const subjectDisplayName = supplementalLabel || primaryLabel;

    if (!fixedColumnKey && !subjectDisplayName) {
      return columns;
    }

    columns.push({
      key: fixedColumnKey ?? `subject_${index}`,
      index,
      isFixed: Boolean(fixedColumnKey),
      displayName: fixedColumnKey ? primaryLabel || fixedColumnKey : subjectDisplayName,
      topLabel: supplementalLabel,
      bottomLabel: primaryLabel || supplementalLabel,
    });

    return columns;
  }, []);
}

export function toRegistrationFlag(value) {
  if (typeof value === 'number') {
    return value === 1 ? 1 : 0;
  }

  const normalized = normalizeValue(value);
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return 1;
  }

  return 0;
}

export function isEmptyRow(record) {
  return Object.values(record).every((value) => normalizeValue(value) === '');
}

export function getSubjectColumns(columnOrder) {
  return getSubjectDefinitions(columnOrder).map((column) => column.displayName);
}

export function getSubjectDefinitions(columnOrder) {
  return columnOrder
    .filter((column) => !column.isFixed)
    .map((column) => ({
      key: column.key,
      index: column.index,
      displayName: column.displayName,
      topLabel: column.topLabel,
      bottomLabel: column.bottomLabel,
    }));
}

export function buildStudentRecord(record, columnOrder, rowIndex) {
  const subjectColumns = getSubjectDefinitions(columnOrder);
  const subjectFlags = subjectColumns.reduce((accumulator, subject) => {
    accumulator[subject.key] = toRegistrationFlag(record[subject.key]);
    return accumulator;
  }, {});

  const registeredSubjects = subjectColumns
    .filter((subject) => subjectFlags[subject.key] === 1)
    .map((subject) => subject.displayName);
  const id = coerceDisplayValue(record.id);
  const nameEn = coerceDisplayValue(record.name_en);
  const nameAr = coerceDisplayValue(record.name_ar);

  return {
    rowId: String(rowIndex),
    id,
    name_en: nameEn,
    name_ar: nameAr,
    searchable: {
      id: normalizeValue(id),
      name_en: normalizeValue(nameEn),
      name_ar: normalizeValue(nameAr),
      combined: [id, nameEn, nameAr].map(normalizeValue).join(' '),
    },
    subjectFlags,
    registeredSubjects,
    sourceRow: columnOrder.reduce((accumulator, column) => {
      accumulator[column.key] = column.isFixed
        ? coerceDisplayValue(record[column.key])
        : toRegistrationFlag(record[column.key]);
      return accumulator;
    }, {}),
  };
}

export function mergeStudent(student, modification) {
  if (!modification) {
    return {
      ...student,
      checked: false,
    };
  }

  return {
    ...student,
    ...modification,
    checked: Boolean(modification.checked),
  };
}

export function filterStudents(students, modifications, query) {
  const queryTokens = normalizeValue(query)
    .split(/\s+/)
    .filter(Boolean);

  return students
    .filter((student) => {
      if (!queryTokens.length) {
        return true;
      }

      return queryTokens.every(
        (token) =>
          student.searchable.id.includes(token) ||
          student.searchable.name_en.includes(token) ||
          student.searchable.name_ar.includes(token) ||
          student.searchable.combined.includes(token),
      );
    })
    .map((student) => mergeStudent(student, modifications[student.rowId]));
}

export function countSelectedStudents(students, modifications) {
  return students.reduce(
    (count, student) => count + (modifications[student.rowId]?.checked ? 1 : 0),
    0,
  );
}

export function getStudentDisplayName(student) {
  return coerceDisplayValue(student?.name_en) || coerceDisplayValue(student?.name_ar) || 'Unnamed student';
}

export function getStudentSecondaryName(student) {
  const primaryName = coerceDisplayValue(student?.name_en);
  const secondaryName = coerceDisplayValue(student?.name_ar);

  if (!primaryName || !secondaryName || primaryName === secondaryName) {
    return '';
  }

  return secondaryName;
}