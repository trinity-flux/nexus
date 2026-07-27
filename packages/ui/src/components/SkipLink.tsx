import { cn } from '../lib/cn';

export interface SkipLinkProps {
  /** Id of the main landmark, without the leading hash. */
  targetId: string;
  children: string;
  className?: string;
}

/**
 * The first focusable element on the page, hidden until it has focus.
 *
 * Without it, a keyboard or screen-reader user tabs through the whole header —
 * navigation, search, user menu — on every single page before reaching the
 * content. It is invisible to everyone else, which is why it is so often
 * missing: nobody sees it break.
 */
export function SkipLink({ targetId, children, className }: SkipLinkProps) {
  return (
    <a
      className={cn(
        'sr-only',
        // Undoes .sr-only once focused, and only then.
        'focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-100',
        'focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2',
        'focus-visible:font-medium focus-visible:text-primary-fg focus-visible:text-sm',
        className,
      )}
      href={`#${targetId}`}
    >
      {children}
    </a>
  );
}
