import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup (not strictly needed for export service, but keeps pattern)
// ─────────────────────────────────────────────────────────────────────────────

mock.module('@/lib/prisma', {
  namedExports: {
    prisma: {
      memory: { findMany: async () => [], findUnique: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) },
    },
  },
});

mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

const { ReportExportService } = await import('@/lib/services/report-export-service');

// ─────────────────────────────────────────────────────────────────────────────
// ReportExportService
// ─────────────────────────────────────────────────────────────────────────────

describe('ReportExportService', () => {
  describe('escapeCSVField', () => {
    it('returns empty string for null/undefined', () => {
      assert.equal(ReportExportService.escapeCSVField(null), '');
      assert.equal(ReportExportService.escapeCSVField(undefined), '');
    });

    it('does not wrap simple values', () => {
      assert.equal(ReportExportService.escapeCSVField('hello'), 'hello');
      assert.equal(ReportExportService.escapeCSVField('123'), '123');
    });

    it('wraps values with commas in double quotes', () => {
      assert.equal(ReportExportService.escapeCSVField('a,b'), '"a,b"');
    });

    it('doubles internal double quotes', () => {
      assert.equal(ReportExportService.escapeCSVField('say "hi"'), '"say ""hi"""');
    });

    it('wraps values with newlines', () => {
      assert.equal(ReportExportService.escapeCSVField('line1\nline2'), '"line1\nline2"');
    });
  });

  describe('toCSV', () => {
    it('exports data to CSV with header and rows', () => {
      const data = {
        columns: [
          { field: 'name', label: 'Name' },
          { field: 'amount', label: 'Amount' },
        ],
        rows: [
          { name: 'Alice', amount: 100 },
          { name: 'Bob', amount: 200 },
        ],
      };

      const csv = ReportExportService.toCSV(data);

      const lines = csv.split('\n');
      assert.equal(lines[0], 'Name,Amount');
      assert.equal(lines[1], 'Alice,100');
      assert.equal(lines[2], 'Bob,200');
    });

    it('properly escapes commas in CSV values', () => {
      const data = {
        columns: [{ field: 'desc', label: 'Description' }],
        rows: [{ desc: 'item, with comma' }],
      };

      const csv = ReportExportService.toCSV(data);
      const lines = csv.split('\n');
      assert.equal(lines[1], '"item, with comma"');
    });

    it('handles empty rows', () => {
      const data = {
        columns: [{ field: 'name', label: 'Name' }],
        rows: [],
      };

      const csv = ReportExportService.toCSV(data);
      assert.equal(csv, 'Name');
    });
  });

  describe('toJSON', () => {
    it('exports data to JSON format', () => {
      const data = {
        columns: [
          { field: 'name', label: 'Name' },
          { field: 'amount', label: 'Amount' },
        ],
        rows: [
          { name: 'Alice', amount: 100 },
        ],
      };

      const json = ReportExportService.toJSON(data);
      const parsed = JSON.parse(json);

      assert.equal(parsed.length, 1);
      assert.equal(parsed[0].name, 'Alice');
      assert.equal(parsed[0].amount, 100);
    });

    it('uses null for missing values', () => {
      const data = {
        columns: [{ field: 'name', label: 'Name' }, { field: 'email', label: 'Email' }],
        rows: [{ name: 'Alice' }],
      };

      const json = ReportExportService.toJSON(data);
      const parsed = JSON.parse(json);

      assert.equal(parsed[0].email, null);
    });
  });

  describe('toHTML', () => {
    it('exports data to HTML table', () => {
      const data = {
        columns: [{ field: 'name', label: 'Name' }],
        rows: [{ name: 'Alice' }],
      };

      const html = ReportExportService.toHTML(data);

      assert.ok(html.includes('<table>'));
      assert.ok(html.includes('<th>Name</th>'));
      assert.ok(html.includes('<td>Alice</td>'));
    });

    it('escapes HTML special characters', () => {
      const data = {
        columns: [{ field: 'desc', label: 'Desc' }],
        rows: [{ desc: '<script>alert(1)</script>' }],
      };

      const html = ReportExportService.toHTML(data);

      assert.ok(html.includes('&lt;script&gt;'));
      assert.ok(!html.includes('<script>'));
    });
  });

  describe('toMarkdown', () => {
    it('exports data to Markdown table', () => {
      const data = {
        columns: [
          { field: 'name', label: 'Name' },
          { field: 'amount', label: 'Amount' },
        ],
        rows: [
          { name: 'Alice', amount: 100 },
          { name: 'Bob', amount: 200 },
        ],
      };

      const md = ReportExportService.toMarkdown(data);
      const lines = md.split('\n');

      assert.equal(lines[0], '| Name | Amount |');
      assert.equal(lines[1], '| --- | --- |');
      assert.equal(lines[2], '| Alice | 100 |');
      assert.equal(lines[3], '| Bob | 200 |');
    });

    it('escapes pipe characters in Markdown', () => {
      const data = {
        columns: [{ field: 'desc', label: 'Desc' }],
        rows: [{ desc: 'a|b' }],
      };

      const md = ReportExportService.toMarkdown(data);

      assert.ok(md.includes('a\\|b'));
    });
  });

  describe('toExcelXML', () => {
    it('exports data to Excel XML format', () => {
      const data = {
        columns: [{ field: 'name', label: 'Name' }],
        rows: [{ name: 'Alice' }],
      };

      const xml = ReportExportService.toExcelXML(data);

      assert.ok(xml.includes('<?xml'));
      assert.ok(xml.includes('<Workbook'));
      assert.ok(xml.includes('Alice'));
    });
  });

  describe('generateFilename', () => {
    it('generates a filename with date and extension', () => {
      const filename = ReportExportService.generateFilename('My Report', 'csv', new Date('2025-01-15'));

      assert.ok(filename.includes('my-report'));
      assert.ok(filename.includes('2025-01-15'));
      assert.ok(filename.endsWith('.csv'));
    });

    it('uses xml extension for excel format', () => {
      const filename = ReportExportService.generateFilename('Report', 'excel', new Date('2025-01-15'));

      assert.ok(filename.endsWith('.xml'));
    });

    it('handles empty report name', () => {
      const filename = ReportExportService.generateFilename('', 'json', new Date('2025-01-15'));

      assert.ok(filename.includes('report'));
      assert.ok(filename.endsWith('.json'));
    });
  });
});
