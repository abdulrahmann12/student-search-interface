import * as XLSX from 'xlsx';

export function exportStudentsToExcel({ students, modifications, exportColumns, headerRows }) {
  const resolvedHeaderRows = (headerRows?.length
    ? headerRows
    : [exportColumns.map((column) => column.bottomLabel || column.displayName)]
  ).map((row, rowIndex, rows) => {
    const normalizedRow = exportColumns.map((column, columnIndex) => {
      const fallback = rowIndex === rows.length - 1 ? column.bottomLabel || column.displayName : '';
      return row[columnIndex] ?? fallback;
    });

    normalizedRow.push(rowIndex === rows.length - 1 ? 'checked' : '');
    return normalizedRow;
  });

  const dataRows = students.map((student) => [
    ...exportColumns.map((column) => student.sourceRow[column.key] ?? ''),
    Boolean(modifications[student.rowId]?.checked),
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([...resolvedHeaderRows, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  XLSX.writeFile(workbook, 'students_updated.xlsx');
}