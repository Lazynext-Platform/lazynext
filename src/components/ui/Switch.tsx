'use client';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  const switchId = id || (label ? `switch-${label.toLowerCase().replace(/\s/g, '-')}` : undefined);
  return (
    <div className="flex items-center gap-3">
      <button
        id={switchId}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 border-2 rounded-[var(--radius-sm)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: 'var(--c-ink)',
          backgroundColor: checked ? 'var(--c-accent)' : 'var(--c-surface)',
        }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 border-2 transition-transform"
          style={{
            borderColor: 'var(--c-ink)',
            backgroundColor: 'var(--c-surface)',
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </button>
      {label && (
        <label htmlFor={switchId} className="text-sm text-fg cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  );
}
