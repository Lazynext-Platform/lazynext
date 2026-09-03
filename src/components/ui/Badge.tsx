type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const variantStyles: Record<BadgeVariant, string> = {
  default: '',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
  info: 'bg-info text-white',
  accent: 'bg-accent text-accent-fg',
};

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  return (
    <span className={`badge ${variantStyles[variant]} ${className}`.trim()}>
      {children}
    </span>
  );
}
