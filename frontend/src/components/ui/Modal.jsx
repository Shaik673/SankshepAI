import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  className,
  hideClose = false,
}) {
  const overlayRef = useRef(null);

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative w-full glass-card shadow-glass animate-scale-in',
          sizes[size] || sizes.md,
          className
        )}
      >
        {/* Header */}
        {(title || !hideClose) && (
          <div className="flex items-start justify-between p-5 pb-4 border-b border-graphite-700/60">
            <div>
              {title && (
                <h2 id="modal-title" className="text-white font-semibold text-lg">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-graphite-400 text-sm mt-1">{description}</p>
              )}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-graphite-400 hover:bg-graphite-700/60 hover:text-white transition-colors ml-4 shrink-0"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={cn(!title && !hideClose ? 'p-5' : 'px-5 py-4')}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
