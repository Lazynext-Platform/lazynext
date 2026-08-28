'use client';

import { useMemo } from 'react';
import { Coins } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

/**
 * Live cost estimation component.
 * Shows estimated credit costs before running creative tools.
 * Updates in real-time as the user changes settings.
 */

export interface CostEstimateItem {
  tool: string;
  label: string;
  credits: number;
  count?: number;
}

interface CostEstimatorProps {
  items: CostEstimateItem[];
  /** Current credit balance (optional, shows warning if insufficient) */
  balance?: number | null;
}

export function CostEstimator({ items, balance }: CostEstimatorProps) {
  const { t } = useI18n();

  const { total, breakdown } = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.credits * (item.count || 1), 0);
    const breakdown = items.map(item => ({
      ...item,
      lineTotal: item.credits * (item.count || 1),
    }));
    return { total, breakdown };
  }, [items]);

  const insufficient = balance !== null && balance !== undefined && balance < total;

  if (items.length === 0) return null;

  return (
    <div className={`rounded-lg border p-3 text-xs ${insufficient ? 'border-danger/30 bg-danger/5' : 'border-line bg-app'}`}>
      <div className="mb-2 flex items-center gap-1.5 font-medium text-fg">
        <Coins className="h-3.5 w-3.5 text-brand-accent" />
        {t('costEstimate.title')}
      </div>

      <div className="space-y-1">
        {breakdown.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-fg-faint">
            <span>
              {item.label}
              {item.count && item.count > 1 ? ` × ${item.count}` : ''}
            </span>
            <span className={insufficient ? 'text-danger' : 'text-fg'}>
              {item.lineTotal} {t('costEstimate.credits')}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-line pt-2 font-bold">
        <span className="text-fg">{t('costEstimate.total')}</span>
        <span className={insufficient ? 'text-danger' : 'text-brand-accent'}>
          {total} {t('costEstimate.credits')}
        </span>
      </div>

      {insufficient && (
        <div className="mt-2 text-danger">
          {t('costEstimate.insufficient', { 0: String(balance || 0) })}
        </div>
      )}

      {balance !== null && balance !== undefined && !insufficient && (
        <div className="mt-1 text-fg-faint">
          {t('costEstimate.remaining', { 0: String(balance - total) })}
        </div>
      )}
    </div>
  );
}
