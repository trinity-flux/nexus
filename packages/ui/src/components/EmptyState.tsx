import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  /** One sentence on why it is empty. */
  description?: ReactNode;
  /** The one thing to do about it. Keep it to a single action. */
  action?: ReactNode;
  className?: string;
}

/**
 * What a list shows when it has nothing in it.
 *
 * An empty list with no explanation reads as a bug. Naming the state and
 * offering the action that fills it turns a dead end into the obvious next
 * step — which matters most on a new forum, where most lists start empty.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-border-default border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="size-8 text-fg-subtle" /> : null}
      <div className="flex flex-col gap-1">
        <p className="font-medium text-fg">{title}</p>
        {description ? <p className="max-w-prose text-fg-muted text-sm">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
