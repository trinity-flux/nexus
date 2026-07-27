import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export const TooltipProvider = RadixTooltip.Provider;

export interface TooltipProps {
  /** The element the tooltip describes. Must be focusable. */
  children: ReactNode;
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

/**
 * A hover and focus hint.
 *
 * Only ever supplementary. Anything a tooltip is the sole carrier of is
 * invisible on a touch device, where there is no hover — so icon-only buttons
 * carry an `aria-label` as well, and the tooltip repeats it for sighted mouse
 * users rather than being the only copy.
 */
export function Tooltip({ children, content, side = 'top', className }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          className={cn(
            'z-50 rounded-md border border-border-default bg-surface-raised px-2.5 py-1.5 text-fg text-xs shadow-md',
            'data-[state=delayed-open]:animate-pop-in',
            className,
          )}
          side={side}
          sideOffset={6}
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
