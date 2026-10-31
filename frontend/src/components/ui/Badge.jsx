import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  default: 'bg-graphite-700 text-graphite-300 border-graphite-600',
  indigo: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/20',
  cyan: 'bg-cyan/10 text-cyan border-cyan/20',
  emerald: 'bg-emerald/10 text-emerald border-emerald/20',
  amber: 'bg-amber/10 text-amber border-amber/20',
  rose: 'bg-rose/10 text-rose border-rose/20',
  violet: 'bg-violet/10 text-violet border-violet/20',
  outline: 'bg-transparent text-graphite-300 border-graphite-600',
};

export default function Badge({ variant = 'default', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
