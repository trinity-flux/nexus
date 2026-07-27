import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title: string;
  /**
   * What went wrong, in the user's terms. Never a raw exception message: it
   * tells them nothing and leaks internals.
   */
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * A failure the user can act on.
 *
 * `role="alert"` so it is announced the moment it replaces the content it
 * failed to load. The retry button matters more than the wording: most of
 * these are a dropped connection, and one tap fixes them.
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/30 bg-danger/5 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <AlertTriangle aria-hidden="true" className="size-8 text-danger-text" />
      <div className="flex flex-col gap-1">
        <p className="font-medium text-fg">{title}</p>
        {description ? <p className="max-w-prose text-fg-muted text-sm">{description}</p> : null}
      </div>
      {onRetry ? (
        <Button onClick={onRetry} size="sm" variant="secondary">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
