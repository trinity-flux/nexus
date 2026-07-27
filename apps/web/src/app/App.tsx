import { ThemeProvider, ToastProvider, TooltipProvider } from '@trinity-nexus/ui';
import { useMemo } from 'react';
import { Provider as StoreProvider } from 'react-redux';
import { RouterProvider } from 'react-router';

import { I18nProvider } from '@/shared/i18n/I18nProvider';

import { AppErrorBoundary } from './AppErrorBoundary';
import { createContainer } from './di/container';
import { RootErrorFallback } from './RootErrorFallback';
import { createAppRouter } from './router';
import { createStore } from './store/store';

/**
 * The composition root.
 *
 * The container, the store and the router are built once and never rebuilt:
 * `useMemo` with no dependencies rather than module-level constants, so a test
 * can mount two independent apps without them sharing a store.
 */
export function App() {
  const { store, router } = useMemo(() => {
    const container = createContainer();
    return { store: createStore(container), router: createAppRouter() };
  }, []);

  return (
    <AppErrorBoundary fallback={(retry) => <RootErrorFallback onRetry={retry} />}>
      <I18nProvider>
        <ThemeProvider>
          <TooltipProvider delayDuration={300}>
            <ToastProvider>
              <StoreProvider store={store}>
                <RouterProvider router={router} />
              </StoreProvider>
            </ToastProvider>
          </TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </AppErrorBoundary>
  );
}
