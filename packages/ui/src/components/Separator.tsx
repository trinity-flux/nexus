import * as RadixSeparator from '@radix-ui/react-separator';

import { cn } from '../lib/cn';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  /**
   * True when the line only groups things visually. Radix then hides it from
   * assistive tech, which is right far more often than not: a screen reader
   * announcing "separator" between every list item is noise.
   */
  decorative?: boolean;
  className?: string;
}

export function Separator({
  orientation = 'horizontal',
  decorative = true,
  className,
}: SeparatorProps) {
  return (
    <RadixSeparator.Root
      className={cn(
        'shrink-0 bg-border-default',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      decorative={decorative}
      orientation={orientation}
    />
  );
}
