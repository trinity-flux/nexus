import { use } from 'react';

import { I18nContext, type I18nContextValue } from './i18nContext';

export function useI18n(): I18nContextValue {
  const context = use(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used inside an <I18nProvider>.');
  }

  return context;
}
