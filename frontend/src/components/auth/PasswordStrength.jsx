import React from 'react';
import { cn } from '../../lib/utils';

const COLOR_MAP = {
  'very-weak': 'bg-rose',
  weak: 'bg-rose',
  fair: 'bg-amber',
  good: 'bg-emerald',
  strong: 'bg-cyan',
};

const WIDTH_MAP = {
  'very-weak': 'w-1/5',
  weak: 'w-2/5',
  fair: 'w-3/5',
  good: 'w-4/5',
  strong: 'w-full',
};

export default function PasswordStrength({ strength }) {
  if (!strength) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {['very-weak', 'weak', 'fair', 'good', 'strong'].map((level, i) => {
          const levels = ['very-weak', 'weak', 'fair', 'good', 'strong'];
          const currentIdx = levels.indexOf(strength.strength);
          const filled = i <= currentIdx;
          return (
            <div
              key={level}
              className={cn(
                'flex-1 h-1 rounded-full transition-all duration-300',
                filled ? COLOR_MAP[strength.strength] : 'bg-graphite-600'
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-medium', {
          'text-rose': strength.strength === 'very-weak' || strength.strength === 'weak',
          'text-amber': strength.strength === 'fair',
          'text-emerald': strength.strength === 'good',
          'text-cyan': strength.strength === 'strong',
        })}>
          {strength.label}
        </span>
        <div className="flex gap-2">
          {[
            { key: 'length', label: '8+ chars' },
            { key: 'uppercase', label: 'A-Z' },
            { key: 'number', label: '0-9' },
            { key: 'special', label: '#@!' },
          ].map(({ key, label }) => (
            <span
              key={key}
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded',
                strength.checks[key]
                  ? 'bg-emerald/10 text-emerald'
                  : 'bg-graphite-700 text-graphite-500'
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
