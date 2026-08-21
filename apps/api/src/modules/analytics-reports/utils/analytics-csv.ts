const DANGEROUS_CSV_PREFIX = /^[=+\-@\t\r]/;

export type CsvValue = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  header: string;

  value(row: T): CsvValue;
}

function sanitizeSpreadsheetValue(value: string): string {
  if (DANGEROUS_CSV_PREFIX.test(value)) {
    return `'${value}`;
  }

  return value;
}

function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = sanitizeSpreadsheetValue(String(value));

  return `"${normalized.replace(/"/g, '""')}"`;
}

export function createCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(',');

  const content = rows.map((row) => columns.map((column) => escapeCsvValue(column.value(row))).join(','));

  return ['\uFEFF' + header, ...content].join('\r\n');
}

export function createCsvFilename(reportName: string, from: string, to: string): string {
  const safeReportName = reportName.replace(/[^a-z0-9-_]/gi, '-');

  return [safeReportName, from, to].join('_') + '.csv';
}
