// ── Chart Data Formatter ──
// Transforms raw analytics rows into chart-ready structures and provides
// number / date / currency formatting helpers. No external dependencies.

export type AggregationType = 'count' | 'sum' | 'avg' | 'min' | 'max';

export interface AggregationSpec {
  field: string;
  type: AggregationType;
  alias?: string;
}

export interface LineChartConfig {
  xField: string;
  yField: string;
  seriesField?: string;
  title?: string;
}

export interface BarChartConfig {
  labelField: string;
  valueField: string;
  colorField?: string;
  title?: string;
}

export interface PieChartConfig {
  labelField: string;
  valueField: string;
  title?: string;
}

export interface TableConfig {
  columns?: string[];
  title?: string;
}

export interface MetricConfig {
  label?: string;
  unit?: string;
  decimals?: number;
}

export interface GaugeConfig {
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
}

export interface LineSeries {
  name: string;
  points: { x: string | number; y: number }[];
}

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export interface PieDatum {
  label: string;
  value: number;
}

export interface TableData {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface GaugeData {
  value: number;
  target: number;
  percent: number;
  label: string;
  unit: string;
}

// ── ChartFormatter ──

export const ChartFormatter = {
  /**
   * Format an array of rows into line chart series.
   * If `seriesField` is provided, rows are grouped into multiple series.
   */
  toLineChart(data: Record<string, unknown>[], config: LineChartConfig): {
    series: LineSeries[];
    title: string;
  } {
    const { xField, yField, seriesField } = config;

    if (!seriesField) {
      const points = data.map((row) => ({
        x: row[xField] as string | number,
        y: Number(row[yField]) || 0,
      }));
      return {
        series: [{ name: config.title || yField, points }],
        title: config.title || '',
      };
    }

    // Group by series field
    const seriesMap = new Map<string, { x: string | number; y: number }[]>();
    for (const row of data) {
      const key = String(row[seriesField] ?? 'unknown');
      if (!seriesMap.has(key)) seriesMap.set(key, []);
      seriesMap.get(key)!.push({
        x: row[xField] as string | number,
        y: Number(row[yField]) || 0,
      });
    }

    const series: LineSeries[] = [];
    for (const [name, points] of seriesMap) {
      series.push({ name, points });
    }

    return { series, title: config.title || '' };
  },

  /**
   * Format rows into bar chart data.
   */
  toBarChart(data: Record<string, unknown>[], config: BarChartConfig): {
    data: BarDatum[];
    title: string;
  } {
    const { labelField, valueField, colorField } = config;
    const chartData: BarDatum[] = data.map((row) => ({
      label: String(row[labelField] ?? ''),
      value: Number(row[valueField]) || 0,
      color: colorField ? (row[colorField] as string | undefined) : undefined,
    }));
    return { data: chartData, title: config.title || '' };
  },

  /**
   * Format rows into pie chart data.
   */
  toPieChart(data: Record<string, unknown>[], config: PieChartConfig): {
    data: PieDatum[];
    title: string;
  } {
    const { labelField, valueField } = config;
    const chartData: PieDatum[] = data.map((row) => ({
      label: String(row[labelField] ?? ''),
      value: Number(row[valueField]) || 0,
    }));
    return { data: chartData, title: config.title || '' };
  },

  /**
   * Format rows into a table structure (columns + rows).
   */
  toTable(data: Record<string, unknown>[], config?: TableConfig): TableData {
    let columns = config?.columns;
    if (!columns || columns.length === 0) {
      // Derive columns from the first row's keys, preserving insertion order
      if (data.length > 0) {
        columns = Object.keys(data[0]);
      } else {
        columns = [];
      }
    }
    const rows = data.map((row) => {
      const filtered: Record<string, unknown> = {};
      for (const col of columns) {
        filtered[col] = row[col];
      }
      return filtered;
    });
    return { columns, rows };
  },

  /**
   * Format a single metric value.
   */
  toMetric(value: number, config?: MetricConfig): {
    value: number;
    display: string;
    label: string;
    unit: string;
  } {
    const unit = config?.unit || '';
    const decimals = config?.decimals ?? 0;
    return {
      value,
      display: this.formatNumber(value, { decimals }),
      label: config?.label || '',
      unit,
    };
  },

  /**
   * Format gauge data (value vs target).
   */
  toGauge(value: number, target: number, config?: GaugeConfig): GaugeData {
    const max = config?.max ?? target;
    const min = config?.min ?? 0;
    const range = max - min;
    const percent = range > 0 ? Math.min(100, Math.max(0, ((value - min) / range) * 100)) : 0;
    return {
      value,
      target,
      percent: Math.round(percent * 10) / 10,
      label: config?.label || '',
      unit: config?.unit || '',
    };
  },

  /**
   * Convert an array of rows (or array of arrays) to a CSV string.
   */
  toCSV(data: Record<string, unknown>[] | unknown[][]): string {
    if (data.length === 0) return '';

    let rows: Record<string, unknown>[];
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      // array of arrays → treat first row as header
      const arrData = data as unknown[][];
      const headers = arrData[0] as string[];
      rows = arrData.slice(1).map((arr) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          obj[h] = (arr as unknown[])[i];
        });
        return obj;
      });
    } else {
      rows = data as Record<string, unknown>[];
    }

    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escapeCell = (val: unknown): string => {
      const s = val === null || val === undefined ? '' : String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => escapeCell(row[h])).join(','));
    }
    return lines.join('\n');
  },

  /**
   * Convert rows to a Markdown table.
   */
  toMarkdown(data: Record<string, unknown>[], config?: TableConfig): string {
    if (data.length === 0) return '';
    let columns = config?.columns;
    if (!columns || columns.length === 0) {
      columns = Object.keys(data[0]);
    }

    const header = `| ${columns.join(' | ')} |`;
    const separator = `| ${columns.map(() => '---').join(' | ')} |`;
    const bodyLines = data.map((row) =>
      `| ${columns!.map((c) => String(row[c] ?? '')).join(' | ')} |`,
    );

    return [header, separator, ...bodyLines].join('\n');
  },

  /**
   * Format a number with commas, optional decimals, and abbreviation.
   */
  formatNumber(n: number, opts?: { decimals?: number; abbreviate?: boolean }): string {
    const decimals = opts?.decimals ?? 0;
    if (opts?.abbreviate && Math.abs(n) >= 1000) {
      const abs = Math.abs(n);
      if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
      if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
      if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    }
    return n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  /**
   * Format a number as a percentage string.
   */
  formatPercent(n: number, decimals?: number): string {
    const d = decimals ?? 1;
    return `${n.toFixed(d)}%`;
  },

  /**
   * Format a number as currency.
   */
  formatCurrency(n: number, currency?: string): string {
    try {
      return n.toLocaleString('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      return `$${n.toFixed(2)}`;
    }
  },

  /**
   * Format a date. Supports 'short', 'long', 'iso', and 'datetime'.
   */
  formatDate(d: Date | string | number, format?: 'short' | 'long' | 'iso' | 'datetime'): string {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return String(d);

    switch (format) {
      case 'iso':
        return date.toISOString().split('T')[0];
      case 'long':
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'datetime':
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'short':
      default:
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
    }
  },

  /**
   * Aggregate data by a grouping field with one or more aggregations.
   */
  aggregateBy(
    data: Record<string, unknown>[],
    groupBy: string,
    aggregations: AggregationSpec[],
  ): Record<string, unknown>[] {
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of data) {
      const key = String(row[groupBy] ?? 'unknown');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const result: Record<string, unknown>[] = [];
    for (const [key, rows] of groups) {
      const obj: Record<string, unknown> = { [groupBy]: key };
      for (const agg of aggregations) {
        const alias = agg.alias || `${agg.type}_${agg.field}`;
        const values = rows
          .map((r) => Number(r[agg.field]))
          .filter((v) => !isNaN(v));

        switch (agg.type) {
          case 'count':
            obj[alias] = rows.length;
            break;
          case 'sum':
            obj[alias] = Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
            break;
          case 'avg':
            obj[alias] = values.length > 0
              ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
              : 0;
            break;
          case 'min':
            obj[alias] = values.length > 0 ? Math.min(...values) : 0;
            break;
          case 'max':
            obj[alias] = values.length > 0 ? Math.max(...values) : 0;
            break;
        }
      }
      result.push(obj);
    }
    return result;
  },

  /**
   * Sort data by a field in ascending or descending order.
   */
  sortBy(
    data: Record<string, unknown>[],
    field: string,
    direction: 'asc' | 'desc' = 'asc',
  ): Record<string, unknown>[] {
    const sorted = [...data];
    sorted.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av === bv) return 0;
      if (av === null || av === undefined) return direction === 'asc' ? -1 : 1;
      if (bv === null || bv === undefined) return direction === 'asc' ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return direction === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return direction === 'asc' ? cmp : -cmp;
    });
    return sorted;
  },
};
