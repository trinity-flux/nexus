import type { TextareaHTMLAttributes } from 'react';

import { cn } from '../lib/cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-border-default bg-bg px-3 py-2.5 text-fg text-sm',
        'placeholder:text-fg-subtle',
        'transition-colors duration-150 ease-out',
        'hover:border-border-strong',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-danger',
        // Vertical only. Horizontal resizing lets a user drag the control out
        // of the layout, and it never helps.
        'resize-y',
        className,
      )}
      rows={rows}
      {...props}
    />
  );
}
