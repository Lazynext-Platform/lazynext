import { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center border-2 rounded-[var(--radius-md)] mb-6"
        style={{
          borderColor: 'var(--c-ink)',
          backgroundColor: 'var(--c-surface-alt)',
          boxShadow: 'var(--shadow-hard)',
        }}
      >
        <Icon className="h-8 w-8" style={{ color: 'var(--c-fg-muted)' }} />
      </div>
      <h3 className="heading-display text-lg mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-fg-secondary max-w-sm mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
