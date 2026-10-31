import React from 'react';
import { cn } from '../../lib/utils';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-graphite-700/60 border border-graphite-600/40 flex items-center justify-center text-graphite-500 mb-5">
          <Icon size={28} />
        </div>
      )}
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      {description && (
        <p className="text-graphite-400 text-sm max-w-sm leading-relaxed mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant={action.variant || 'primary'}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
