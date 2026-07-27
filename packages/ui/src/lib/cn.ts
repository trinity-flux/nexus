import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names and resolves Tailwind conflicts in favour of the last one.
 *
 * Without the merge step, `cn('px-2', 'px-4')` emits both and the winner is
 * decided by stylesheet order — which means a component prop meant to override
 * a default silently does nothing. This is what makes `className` a reliable
 * escape hatch on every design-system component.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
