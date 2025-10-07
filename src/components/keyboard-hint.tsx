import React from 'react';

interface KeyboardHintProps {
  keys: string[];
  className?: string;
}

export function KeyboardHint({ keys, className = '' }: KeyboardHintProps) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs text-gray-400 ${className}`}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="mx-0.5">+</span>}
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 border border-gray-300 rounded shadow-sm">
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  );
}
