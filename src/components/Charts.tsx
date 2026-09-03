'use client';

import { useMemo } from 'react';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  maxBars?: number;
}

/**
 * Lightweight SVG bar chart — no external dependencies.
 */
export function BarChart({ data, height = 200, maxBars = 12 }: BarChartProps) {
  const chartData = data.slice(0, maxBars);
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const barWidth = 100 / Math.max(chartData.length, 1);
  const gap = barWidth * 0.15;

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 100 ${height / 3}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {chartData.map((d, i) => {
          const barHeight = (d.value / maxValue) * (height / 3 - 10);
          const x = i * barWidth + gap;
          const w = barWidth - gap * 2;
          const y = height / 3 - barHeight - 2;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={w}
                height={barHeight}
                fill={d.color || 'var(--c-accent)'}
                rx="0.5"
              />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between mt-2 text-xs text-fg-muted">
        {chartData.map((d, i) => (
          <span key={i} className="truncate" style={{ width: `${barWidth}%` }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color?: string }[];
  size?: number;
}

const COLORS = ['#00b2fc', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#eab308', '#06b6d4', '#ef4444'];

/**
 * Lightweight SVG donut chart — no external dependencies.
 */
export function DonutChart({ data, size = 160 }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2 - 10;
  const innerRadius = radius * 0.6;
  const cx = size / 2;
  const cy = size / 2;

  const segments = useMemo(() => {
    if (total === 0) return [];
    let currentAngle = -Math.PI / 2;
    return data.map((d, i) => {
      const angle = (d.value / total) * Math.PI * 2;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const x3 = cx + innerRadius * Math.cos(endAngle);
      const y3 = cy + innerRadius * Math.sin(endAngle);
      const x4 = cx + innerRadius * Math.cos(startAngle);
      const y4 = cy + innerRadius * Math.sin(startAngle);

      const largeArc = angle > Math.PI ? 1 : 0;

      const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
      return { path, color: d.color || COLORS[i % COLORS.length], label: d.label, value: d.value };
    });
  }, [data, total]);

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--c-surface-alt)" strokeWidth={radius - innerRadius} />
        ) : (
          segments.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} stroke="var(--c-surface)" strokeWidth="1" />
          ))
        )}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="bold" fill="var(--c-fg)">
          {total}
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color || COLORS[i % COLORS.length] }} />
            <span className="flex-1">{d.label}</span>
            <span className="font-semibold">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  label?: string;
}

/**
 * Circular progress ring.
 */
export function ProgressRing({ value, max, size = 120, label }: ProgressRingProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--c-surface-alt)"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={pct >= 100 ? 'var(--c-success)' : 'var(--c-accent)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="bold" fill="var(--c-fg)">
          {Math.round(pct)}%
        </text>
      </svg>
      {label && <span className="text-xs text-fg-muted">{label}</span>}
    </div>
  );
}
