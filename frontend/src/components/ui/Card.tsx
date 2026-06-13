import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({ className, padding = 'md', hover = false, ...props }: CardProps) {
  const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-7' };
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-black/[0.06] transition-all duration-200',
        paddings[padding],
        className
      )}
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={hover ? e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      } : undefined}
      onMouseLeave={hover ? e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      } : undefined}
      {...props}
    />
  );
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between mb-5', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <h3 className={cn('text-[15px] font-semibold text-gray-900 tracking-tight', className)}>
      {children}
    </h3>
  );
}

export function CardSection({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('border-t border-black/[0.05] pt-4 mt-4', className)}>
      {children}
    </div>
  );
}
