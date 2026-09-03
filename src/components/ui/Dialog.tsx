'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlayClick?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Focus trap + ESC to close
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Focus first focusable element
    requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus() ?? dialogRef.current?.focus();
    });

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
      aria-describedby={description ? 'dialog-desc' : undefined}
    >
      {/* Overlay: solid ink at 80% opacity (no blur — Neo-Brutalist) */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--c-ink)', opacity: 0.8 }}
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto bg-surface border-[3px] rounded-[var(--radius-md)]`}
        style={{
          borderColor: 'var(--c-ink)',
          boxShadow: 'var(--shadow-hard-lg)',
        }}
      >
        {/* Header */}
        {(title || description) && (
          <div className="border-b-2 p-6" style={{ borderColor: 'var(--c-ink)' }}>
            {title && (
              <h2 id="dialog-title" className="heading-display text-xl">
                {title}
              </h2>
            )}
            {description && (
              <p id="dialog-desc" className="mt-2 text-sm text-fg-secondary">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 border-2 rounded-[var(--radius-sm)] bg-surface hover:bg-hover transition-colors"
          style={{ borderColor: 'var(--c-ink)' }}
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className="flex items-center justify-end gap-3 border-t-2 p-6"
            style={{ borderColor: 'var(--c-ink)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
