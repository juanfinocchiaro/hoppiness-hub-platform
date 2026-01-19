import { utils, writeFile } from 'xlsx';

interface ExportOptions {
  filename?: string;
  sheetName?: string;
}

export function useExportToExcel() {
  const exportToExcel = <T extends Record<string, any>>(
    data: T[],
    columns: { key: keyof T; label: string; format?: (value: any) => any }[],
    options: ExportOptions = {}
  ) => {
    const { filename = 'export', sheetName = 'Datos' } = options;

    // Transform data with formatted values
    const formattedData = data.map((row) => {
      const formattedRow: Record<string, any> = {};
      columns.forEach((col) => {
        const value = row[col.key];
        formattedRow[col.label] = col.format ? col.format(value) : value;
      });
      return formattedRow;
    });

    // Create worksheet
    const ws = utils.json_to_sheet(formattedData);

    // Auto-size columns
    const colWidths = columns.map((col) => ({
      wch: Math.max(
        col.label.length,
        ...formattedData.map((row) => String(row[col.label] || '').length)
      ) + 2,
    }));
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, sheetName);

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}_${date}.xlsx`;

    // Download
    writeFile(wb, fullFilename);
  };

  return { exportToExcel };
}
