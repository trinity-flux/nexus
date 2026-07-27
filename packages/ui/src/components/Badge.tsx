import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-medium text-xs',
  {
    variants: {
      variant: {
        neutral: 'bg-surface-raised text-fg-muted',
        primary: 'bg-primary-subtle text-primary-text',
        accent: 'bg-accent/15 text-accent-text',
        success: 'bg-success/15 text-success-text',
        warning: 'bg-warning/15 text-warning-text',
        danger: 'bg-danger/15 text-danger-text',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * A status or category label.
 *
 * Colour is never the only signal — every badge carries text — because roughly
 * one man in twelve cannot separate the success green from the danger red.
 */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
