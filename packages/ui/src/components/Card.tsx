import type { HTMLAttributes } from 'react';

import { cn } from '../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Lifts the card on hover. Only for cards that are themselves a link or a
   * button — a hover affordance on something that does not respond is a lie.
   */
  interactive?: boolean;
}

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border-default bg-surface',
        interactive && [
          'transition-[background-color,border-color] duration-150 ease-out',
          'hover:border-border-strong hover:bg-surface-raised',
        ],
        className,
      )}
      {...props}
    />
  );
}
