import * as RadixAvatar from '@radix-ui/react-avatar';

import { cn } from '../lib/cn';

const sizeClasses = {
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
  xl: 'size-16 text-lg',
} as const;

export type AvatarSize = keyof typeof sizeClasses;

export interface AvatarProps {
  /** The display name. Used for the alt text and to derive the fallback. */
  name: string;
  src?: string | undefined;
  size?: AvatarSize;
  className?: string;
}

/** First letters of the first two words: "Juan David" becomes "JD". */
function initialsFrom(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-surface-raised',
        sizeClasses[size],
        className,
      )}
    >
      {/*
        Radix only swaps in the fallback once the image has actually failed, so
        a broken avatar never leaves an empty circle. `delayMs` keeps the
        initials from flashing before a fast image arrives.
      */}
      <RadixAvatar.Image alt={name} className="size-full object-cover" src={src} />
      <RadixAvatar.Fallback className="font-medium text-fg-muted uppercase" delayMs={200}>
        {initialsFrom(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
