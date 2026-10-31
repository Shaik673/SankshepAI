import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, hover = false, children, ...props }) {
  return (
    <div
      className={cn(
        hover ? 'glass-card-hover' : 'glass-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('p-5 pb-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('text-white font-semibold text-base', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-graphite-400 text-sm mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn('px-5 pb-5 pt-0 flex items-center gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Stat card
export function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo', trend, className }) {
  const colorMap = {
    indigo: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20',
    cyan: 'bg-cyan-glow text-cyan border-cyan/20',
    emerald: 'bg-emerald/10 text-emerald border-emerald/20',
    violet: 'bg-violet-glow text-violet border-violet/20',
    amber: 'bg-amber/10 text-amber border-amber/20',
    rose: 'bg-rose/10 text-rose border-rose/20',
  };

  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-graphite-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-graphite-500 text-xs">{subtitle}</p>}
          {trend && (
            <div className={cn('flex items-center gap-1 text-xs font-medium', trend.up ? 'text-emerald' : 'text-rose')}>
              <span>{trend.up ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center', colorMap[color])}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </Card>
  );
}
