import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export const DropdownMenu = RadixMenu.Root;
export const DropdownMenuTrigger = RadixMenu.Trigger;

export interface DropdownMenuContentProps {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

/**
 * Radix handles the parts that make a menu usable without a mouse: roving
 * focus with the arrow keys, type-ahead, Escape to close, and collision
 * detection so the menu flips instead of opening off-screen.
 */
export function DropdownMenuContent({
  children,
  align = 'end',
  className,
}: DropdownMenuContentProps) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        align={align}
        className={cn(
          'z-50 min-w-48 overflow-hidden rounded-md border border-border-default bg-surface p-1 shadow-md',
          'data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
          className,
        )}
        sideOffset={6}
      >
        {children}
      </RadixMenu.Content>
    </RadixMenu.Portal>
  );
}

export interface DropdownMenuItemProps extends RadixMenu.DropdownMenuItemProps {
  icon?: LucideIcon;
  /** Red styling for destructive actions, alongside the wording. */
  destructive?: boolean;
}

export function DropdownMenuItem({
  children,
  icon: Icon,
  destructive = false,
  className,
  asChild = false,
  ...props
}: DropdownMenuItemProps) {
  return (
    <RadixMenu.Item
      asChild={asChild}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none',
        'transition-colors duration-150',
        // Radix sets data-highlighted for both mouse hover and keyboard focus,
        // so styling it once covers both without a :hover/:focus pair that can
        // drift apart.
        destructive
          ? 'text-danger-text data-[highlighted]:bg-danger/10'
          : 'text-fg-muted data-[highlighted]:bg-surface-raised data-[highlighted]:text-fg',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      {/*
        With asChild the item merges onto its child, which can hold only one
        element — so the icon is rendered inside the child instead of beside
        it. Slottable is not used here because a menu item's child is usually a
        link whose own content we do not control.
      */}
      {asChild ? (
        children
      ) : (
        <>
          {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
          {children}
        </>
      )}
    </RadixMenu.Item>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <RadixMenu.Separator className={cn('-mx-1 my-1 h-px bg-border-default', className)} />;
}

export function DropdownMenuLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <RadixMenu.Label className={cn('px-2 py-1.5 font-medium text-fg-subtle text-xs', className)}>
      {children}
    </RadixMenu.Label>
  );
}
