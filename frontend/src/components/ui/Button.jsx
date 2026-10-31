import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  outline: `inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl
    border border-indigo-500/40 text-indigo-400 font-medium text-sm
    hover:bg-indigo-600/10 hover:border-indigo-500/60 hover:text-indigo-300
    transition-all duration-200 active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed`,
};

const sizes = {
  xs: 'px-3 py-1.5 text-xs rounded-lg',
  sm: 'px-4 py-2 text-sm',
  md: '', // default from variant classes
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg',
  icon: 'p-2 aspect-square',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  className,
  ...props
}) {
  const variantClass = variants[variant] || variants.primary;
  const sizeClass = size !== 'md' ? sizes[size] : '';

  return (
    <button
      disabled={disabled || loading}
      className={cn(variantClass, sizeClass, className)}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin shrink-0" />
      ) : (
        leftIcon && React.cloneElement(leftIcon, { size: 16, className: 'shrink-0' })
      )}
      {children}
      {!loading && rightIcon &&
        React.cloneElement(rightIcon, { size: 16, className: 'shrink-0' })
      }
    </button>
  );
}
