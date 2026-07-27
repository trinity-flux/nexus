import { createContext } from 'react';

import type { ToastOptions } from './toast';

export interface ToastContextValue {
  /** Shows a toast and returns its id, so a caller can dismiss it early. */
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
