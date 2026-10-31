import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Input({
  label,
  error,
  hint,
  leftIcon,
  rightElement,
  type = 'text',
  className,
  containerClassName,
  required,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-graphite-300">
          {label}
          {required && <span className="text-rose ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-graphite-400 pointer-events-none">
            {React.cloneElement(leftIcon, { size: 16 })}
          </div>
        )}
        <input
          type={inputType}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
          className={cn(
            error ? 'input-field-error' : 'input-field',
            leftIcon && 'pl-10',
            (isPassword || rightElement) && 'pr-11',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-graphite-400 hover:text-white transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {!isPassword && rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p id={`${props.id}-error`} className="flex items-center gap-1.5 text-xs text-rose" role="alert">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${props.id}-hint`} className="text-xs text-graphite-500">{hint}</p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className,
  containerClassName,
  required,
  ...props
}) {
  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-graphite-300">
          {label}
          {required && <span className="text-rose ml-1">*</span>}
        </label>
      )}
      <textarea
        aria-invalid={!!error}
        className={cn(
          error ? 'input-field-error' : 'input-field',
          'resize-none',
          className
        )}
        {...props}
      />
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose" role="alert">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-graphite-500">{hint}</p>
      )}
    </div>
  );
}
