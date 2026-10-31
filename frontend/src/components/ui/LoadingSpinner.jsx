import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 'md', className }) {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <Loader2
      className={cn('animate-spin text-indigo-400', sizes[size] || sizes.md, className)}
    />
  );
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-graphite-600 border-t-indigo-500 animate-spin" />
        <div className="absolute inset-0 rounded-full blur-lg bg-indigo-600/20" />
      </div>
      <p className="text-graphite-400 text-sm animate-pulse">{message}</p>
    </div>
  );
}

export function SkeletonLine({ className }) {
  return (
    <div className={cn('skeleton h-4 rounded', className)} />
  );
}

export function SkeletonCard({ className }) {
  return (
    <div className={cn('glass-card p-5 space-y-3', className)}>
      <SkeletonLine className="w-2/3" />
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-1/2" />
    </div>
  );
}

export function SkeletonGrid({ count = 6, className }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
