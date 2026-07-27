import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

/**
 * A modal dialog built on Radix.
 *
 * The hard parts of a dialog are the ones nobody sees: trapping focus inside
 * it, restoring focus to the trigger on close, marking the rest of the page
 * inert, closing on Escape, and labelling the dialog for screen readers.
 * Radix does all of that. Hand-rolling it is how a keyboard user ends up
 * tabbing into a page they cannot see.
 *
 * The root, trigger and close are re-exported unchanged rather than wrapped:
 * a wrapper here would only re-declare Radix's props, and under
 * `exactOptionalPropertyTypes` a re-declaration is where optional props start
 * failing to line up.
 */
export const Dialog = RadixDialog.Root;
export type DialogProps = RadixDialog.DialogProps;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export interface DialogContentProps {
  /** Required. It becomes the dialog's accessible name. */
  title: ReactNode;
  /**
   * Recommended. Radix warns in development when it is missing, because a
   * dialog with no description gives a screen-reader user only a heading.
   */
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeLabel?: string;
}

export function DialogContent({
  title,
  description,
  children,
  footer,
  className,
  closeLabel = 'Close',
}: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-overlay backdrop-blur-sm',
          'data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in',
        )}
      />
      <RadixDialog.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
          'rounded-lg border border-border-default bg-surface shadow-lg',
          'max-h-[calc(100dvh-4rem)] overflow-y-auto',
          'data-[state=closed]:animate-scale-out data-[state=open]:animate-scale-in',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-border-default border-b p-5">
          <div className="flex flex-col gap-1">
            <RadixDialog.Title className="font-semibold text-fg text-lg">{title}</RadixDialog.Title>
            {description ? (
              <RadixDialog.Description className="text-fg-muted text-sm">
                {description}
              </RadixDialog.Description>
            ) : null}
          </div>

          <RadixDialog.Close
            aria-label={closeLabel}
            className={cn(
              'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md',
              'text-fg-subtle transition-colors duration-150 hover:bg-surface-raised hover:text-fg',
            )}
          >
            <X aria-hidden="true" className="size-4" />
          </RadixDialog.Close>
        </div>

        {children ? <div className="p-5">{children}</div> : null}

        {footer ? (
          <div className="flex justify-end gap-2 border-border-default border-t p-5">{footer}</div>
        ) : null}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
