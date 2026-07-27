import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export const Tabs = RadixTabs.Root;
export const TabsContent = RadixTabs.Content;

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <RadixTabs.List
      className={cn('flex items-center gap-1 border-border-default border-b', className)}
    >
      {children}
    </RadixTabs.List>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'relative cursor-pointer px-3 py-2.5 font-medium text-fg-muted text-sm',
        'transition-colors duration-150 hover:text-fg',
        'data-[state=active]:text-fg',
        // The underline is drawn with a pseudo-element rather than a border so
        // switching tabs does not change the element's height by a pixel and
        // nudge everything below it.
        'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-transparent',
        'data-[state=active]:after:bg-primary',
        className,
      )}
      value={value}
    >
      {children}
    </RadixTabs.Trigger>
  );
}
