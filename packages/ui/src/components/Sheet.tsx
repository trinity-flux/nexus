import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

/**
 * A panel that slides in from an edge of the viewport.
 *
 * It is a dialog, not a styled `<div>`, and it is built on the same Radix
 * primitive as `Dialog` for the same reason: a navigation drawer that does not
 * trap focus leaves a keyboard user tabbing through the page behind it, which
 * they cannot see and cannot get back out of.
 *
 * Separate from `Dialog` because the two differ in more than a class name. A
 * dialog is centred, sized to its content and interrupts; a sheet is anchored
 * to an edge, spans the full height and holds navigation. Merging them would
 * mean a `variant` prop that changes half the styles and none of the meaning.
 */
export const Sheet = RadixDialog.Root;
export type SheetProps = RadixDialog.DialogProps;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;

export interface SheetContentProps {
  /**
   * Required. It becomes the panel's accessible name, and `srOnlyTitle` is
   * the escape hatch for designs that do not show a visible heading — not
   * omitting it, which would leave a screen-reader user in an unnamed dialog.
   */
  title: ReactNode;
  description?: ReactNode;
  /** Hides the title visually while leaving it in the accessibility tree. */
  srOnlyTitle?: boolean;
  /**
   * Which edge it comes from. Defaults to the left, because the control that
   * opens a navigation drawer sits at the top left: a panel that emerges from
   * somewhere other than the thing you pressed breaks the spatial link
   * between the two.
   */
  side?: 'left' | 'right';
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeLabel: string;
}

export function SheetContent({
  title,
  description,
  srOnlyTitle = false,
  side = 'left',
  children,
  footer,
  className,
  closeLabel,
}: SheetContentProps) {
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
          'fixed inset-y-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-surface shadow-lg',
          // Padded for the notch and the home indicator. The document sets
          // `viewport-fit=cover`, so without this the first link sits under the
          // status bar on a phone.
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          side === 'left'
            ? 'left-0 border-border-default border-r data-[state=closed]:animate-sheet-out-left data-[state=open]:animate-sheet-in-left'
            : 'right-0 border-border-default border-l data-[state=closed]:animate-sheet-out-right data-[state=open]:animate-sheet-in-right',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-border-default border-b p-4">
          <div className={cn('flex flex-col gap-1', srOnlyTitle && 'sr-only')}>
            <RadixDialog.Title className="font-semibold text-fg">{title}</RadixDialog.Title>
            {description ? (
              <RadixDialog.Description className="text-fg-muted text-sm">
                {description}
              </RadixDialog.Description>
            ) : null}
          </div>

          <RadixDialog.Close
            aria-label={closeLabel}
            className={cn(
              // 44px, the practical minimum for a thumb. This is the control
              // people reach for most on a drawer.
              'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md',
              'text-fg-subtle transition-colors duration-150 hover:bg-surface-raised hover:text-fg',
              srOnlyTitle && 'ml-auto',
            )}
          >
            <X aria-hidden="true" className="size-5" />
          </RadixDialog.Close>
        </div>

        {/* The panel scrolls, not the page behind it, so a long menu on a
            short screen stays reachable. */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>

        {footer ? <div className="border-border-default border-t p-4">{footer}</div> : null}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
