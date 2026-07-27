export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /**
   * Milliseconds before it dismisses itself. Errors default to staying until
   * dismissed: a message that vanishes before it is read is worse than none,
   * and a failure is exactly the case someone needs time to absorb.
   */
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface Toast extends ToastOptions {
  id: string;
}

export const DEFAULT_TOAST_DURATION = 5000;

/** Errors persist until dismissed. Everything else clears itself. */
export function durationFor(options: ToastOptions): number {
  if (options.duration !== undefined) {
    return options.duration;
  }
  return options.variant === 'danger' ? Number.POSITIVE_INFINITY : DEFAULT_TOAST_DURATION;
}
