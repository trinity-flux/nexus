import { cn } from '../lib/cn';

export interface SpinnerProps {
  className?: string;
  /**
   * What is being waited for. Rendered for screen readers only.
   * Omit when the spinner sits inside a control that already announces its
   * busy state — otherwise the same thing is read twice.
   */
  label?: string;
}

/**
 * An indeterminate progress indicator.
 *
 * Drawn with a border rather than an SVG so it inherits `currentColor` and
 * needs no fill/stroke plumbing at every call site. `animate-spin` is one of
 * the few infinite animations that is legitimate: it means "still working",
 * and it stops when the work does.
 */
export function Spinner({ className, label }: SpinnerProps) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'inline-block size-4 shrink-0 animate-spin rounded-full',
          'border-2 border-current border-t-transparent',
          className,
        )}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  );
}
