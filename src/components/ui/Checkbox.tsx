'use client';

import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Checkbox({ checked, onChange, label, disabled, id }: CheckboxProps) {
  const checkboxId = id || (label ? `cb-${label.toLowerCase().replace(/\s/g, '-')}` : undefined);
  return (
    <div className="flex items-center gap-2.5">
      <button
        id={checkboxId}
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex h-5 w-5 items-center justify-center border-2 rounded-[var(--radius-sm)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: 'var(--c-ink)',
          backgroundColor: checked ? 'var(--c-accent)' : 'var(--c-surface)',
        }}
      >
        {checked && <Check className="h-3.5 w-3.5" style={{ color: 'var(--c-accent-fg)' }} strokeWidth={3} />}
      </button>
      {label && (
        <label htmlFor={checkboxId} className="text-sm text-fg cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  );
}
