import type { HTMLAttributes } from 'react';

import { cn } from '../lib/cn';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * A placeholder shaped like the content that will replace it.
 *
 * Two reasons this is not a spinner. It reserves the final height, so nothing
 * shifts when the data lands — that is the difference between a good and a bad
 * CLS score. And a shape that already resembles the answer makes the wait feel
 * shorter than a spinner does, at the same actual latency.
 *
 * `aria-hidden` because the loading state is announced once, by the region
 * that owns it, not once per grey rectangle.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-raised', className)}
      {...props}
    />
  );
}
