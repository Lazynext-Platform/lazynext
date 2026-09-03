import { forwardRef } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className = '', children, interactive = false, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`card ${interactive ? 'transition-transform' : ''} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
});
