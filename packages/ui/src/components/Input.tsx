import type { InputHTMLAttributes } from 'react';

import { cn } from '../lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-md border border-border-default bg-bg px-3 text-fg text-sm',
        'placeholder:text-fg-subtle',
        'transition-colors duration-150 ease-out',
        'hover:border-border-strong',
        'disabled:cursor-not-allowed disabled:opacity-60',
        // Driven by the aria attribute rather than a separate prop, so the
        // visual state and the state announced to assistive tech cannot
        // disagree.
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  );
}
