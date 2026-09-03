'use client';

import { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className = '', id, ...rest },
  ref,
) {
  const inputId = id || rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="label-mono">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={`input resize-y min-h-[80px] ${error ? 'border-danger' : ''} ${className}`.trim()}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-sm text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  );
});
