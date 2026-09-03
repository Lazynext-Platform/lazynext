'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ToastCtx {
  toast: (variant: ToastVariant, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const variantBorder = {
  success: 'var(--c-success)',
  error: 'var(--c-danger)',
  info: 'var(--c-info)',
  warning: 'var(--c-warning)',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (variant: ToastVariant, title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, variant, title, message }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const value: ToastCtx = {
    toast,
    success: (t, m) => toast('success', t, m),
    error: (t, m) => toast('error', t, m),
    info: (t, m) => toast('info', t, m),
    warning: (t, m) => toast('warning', t, m),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Toast container — top right, stacked */}
      <div
        className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = icons[t.variant];
          return (
            <div
              key={t.id}
              className="flex items-start gap-3 p-4 bg-surface border-2 rounded-[var(--radius-md)] animate-[fade-in_var(--duration-normal)_var(--easing)_both]"
              style={{
                borderColor: 'var(--c-ink)',
                boxShadow: 'var(--shadow-hard)',
                borderLeftColor: variantBorder[t.variant],
                borderLeftWidth: '6px',
              }}
              role="status"
            >
              <Icon
                className="h-5 w-5 shrink-0 mt-0.5"
                style={{ color: variantBorder[t.variant] }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-fg">{t.title}</p>
                {t.message && <p className="mt-0.5 text-sm text-fg-secondary">{t.message}</p>}
              </div>
              <button
                onClick={() => remove(t.id)}
                className="shrink-0 p-0.5 hover:text-fg text-fg-muted transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used inside ToastProvider');
  return c;
}
