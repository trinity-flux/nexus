import * as RadixToast from '@radix-ui/react-toast';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { cn } from '../../lib/cn';
import { durationFor, type Toast, type ToastOptions, type ToastVariant } from './toast';
import { ToastContext, type ToastContextValue } from './toastContext';

const variantIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

const variantIconClasses: Record<ToastVariant, string> = {
  info: 'text-fg-subtle',
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger-text',
};

export interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Transient feedback for actions whose result is not visible in place.
 *
 * Radix renders the viewport as an ARIA live region, so a toast is announced
 * when it appears without stealing focus — and it pauses the dismiss timer
 * while the pointer is over it or the window is in the background, so a toast
 * cannot expire while the user was looking at another tab.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...options, id }]);
    return id;
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext value={value}>
      <RadixToast.Provider swipeDirection="right">
        {children}

        {toasts.map((item) => {
          const variant = item.variant ?? 'info';
          const Icon = variantIcons[variant];
          const duration = durationFor(item);

          return (
            <RadixToast.Root
              className={cn(
                'flex items-start gap-3 rounded-lg border border-border-default bg-surface p-4 shadow-lg',
                'data-[state=open]:animate-slide-in-bottom',
                'data-[state=closed]:animate-slide-out-right',
                'data-[swipe=end]:animate-slide-out-right',
              )}
              // Radix keeps a toast open indefinitely when duration is 0,
              // which is what an error needs: it stays until dismissed.
              duration={Number.isFinite(duration) ? duration : 0}
              key={item.id}
              onOpenChange={(open) => {
                if (!open) {
                  dismiss(item.id);
                }
              }}
            >
              <Icon
                aria-hidden="true"
                className={cn('mt-0.5 size-5 shrink-0', variantIconClasses[variant])}
              />

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <RadixToast.Title className="font-medium text-fg text-sm">
                  {item.title}
                </RadixToast.Title>
                {item.description ? (
                  <RadixToast.Description className="text-fg-muted text-sm">
                    {item.description}
                  </RadixToast.Description>
                ) : null}
              </div>

              {item.action ? (
                <RadixToast.Action
                  altText={item.action.label}
                  className="shrink-0 cursor-pointer font-medium text-primary-text text-sm hover:underline"
                  onClick={item.action.onClick}
                >
                  {item.action.label}
                </RadixToast.Action>
              ) : null}

              <RadixToast.Close
                aria-label="Dismiss"
                className="shrink-0 cursor-pointer text-fg-subtle transition-colors hover:text-fg"
              >
                <X aria-hidden="true" className="size-4" />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}

        <RadixToast.Viewport
          className={cn(
            'fixed right-0 bottom-0 z-100 flex w-full max-w-sm flex-col gap-2 p-4',
            // Clears the iOS home indicator and any Android gesture bar.
            'pb-[max(1rem,env(safe-area-inset-bottom))]',
          )}
        />
      </RadixToast.Provider>
    </ToastContext>
  );
}
