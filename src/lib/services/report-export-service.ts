// ── Types ──

export interface ExportColumn {
  field: string;
  label: string;
}

export interface ExportData {
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
}

export type ExportFormat = 'csv' | 'json' | 'excel' | 'html' | 'markdown';

// ── Report Export Service ──

export const ReportExportService = {
  /**
   * Escape a CSV field value.
   * Wraps in double quotes if the value contains commas, quotes, or newlines.
   * Doubles any internal double quotes.
   */
  escapeCSVField(value: unknown): string {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  },

  /**
   * Export data to CSV format.
   */
  toCSV(data: ExportData): string {
    const { columns, rows } = data;
    const header = columns.map((c) => ReportExportService.escapeCSVField(c.label)).join(',');
    const lines = [header];
    for (const row of rows) {
      const values = columns.map((c) => {
        const val = row[c.field];
        return ReportExportService.escapeCSVField(val);
      });
      lines.push(values.join(','));
    }
    return lines.join('\n');
  },

  /**
   * Export data to JSON format.
   */
  toJSON(data: ExportData): string {
    const { columns, rows } = data;
    const result = rows.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const col of columns) {
        obj[col.field] = row[col.field] ?? null;
      }
      return obj;
    });
    return JSON.stringify(result, null, 2);
  },

  /**
   * Export data to Excel XML (SpreadsheetML 2003) format.
   */
  toExcelXML(data: ExportData): string {
    const { columns, rows } = data;
    const escapeXML = (s: string): string =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const headerCells = columns
      .map((c) => `      <Cell><Data ss:Type="String">${escapeXML(c.label)}</Data></Cell>`)
      .join('\n');

    const rowCells = rows
      .map((row) => {
        const cells = columns
          .map((c) => {
            const val = row[c.field];
            const type = typeof val === 'number' ? 'Number' : 'String';
            const str = val == null ? '' : escapeXML(String(val));
            return `      <Cell><Data ss:Type="${type}">${str}</Data></Cell>`;
          })
          .join('\n');
        return `    <Row>\n${cells}\n    </Row>`;
      })
      .join('\n');

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Report">
  <Table>
    <Row>
${headerCells}
    </Row>
${rowCells}
  </Table>
 </Worksheet>
</Workbook>`;
  },

  /**
   * Export data to HTML table format.
   */
  toHTML(data: ExportData): string {
    const { columns, rows } = data;
    const escapeHTML = (s: string): string =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const headerCells = columns
      .map((c) => `    <th>${escapeHTML(c.label)}</th>`)
      .join('\n');

    const bodyRows = rows
      .map((row) => {
        const cells = columns
          .map((c) => {
            const val = row[c.field];
            return `    <td>${val == null ? '' : escapeHTML(String(val))}</td>`;
          })
          .join('\n');
        return `  <tr>\n${cells}\n  </tr>`;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Report Export</title>
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
  </style>
</head>
<body>
<table>
  <thead>
  <tr>
${headerCells}
  </tr>
  </thead>
  <tbody>
${bodyRows}
  </tbody>
</table>
</body>
</html>`;
  },

  /**
   * Export data to Markdown table format.
   */
  toMarkdown(data: ExportData): string {
    const { columns, rows } = data;
    const escapeMD = (s: string): string => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

    const header = `| ${columns.map((c) => escapeMD(c.label)).join(' | ')} |`;
    const separator = `| ${columns.map(() => '---').join(' | ')} |`;
    const bodyRows = rows.map((row) => {
      const cells = columns.map((c) => {
        const val = row[c.field];
        return val == null ? '' : escapeMD(String(val));
      });
      return `| ${cells.join(' | ')} |`;
    });

    return [header, separator, ...bodyRows].join('\n');
  },

  /**
   * Generate a filename for an export.
   */
  generateFilename(reportName: string, format: ExportFormat, date: Date = new Date()): string {
    const safe = reportName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'report';
    const dateStr = date.toISOString().slice(0, 10);
    const ext = format === 'excel' ? 'xml' : format;
    return `${safe}-${dateStr}.${ext}`;
  },
};
