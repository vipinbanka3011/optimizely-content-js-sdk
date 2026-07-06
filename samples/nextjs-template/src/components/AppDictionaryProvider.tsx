'use client';

import React from 'react';
import { DictionaryProvider } from '@optimizely/cms-sdk/react/client';
import { dictionaryConfig } from '@/i18n';

/**
 * App-level wrapper around DictionaryProvider.
 *
 * Why this wrapper exists:
 *   DictionaryProvider requires a `config` prop that contains dynamic import
 *   functions (e.g. `() => import('./locales/de-de.json')`). Functions cannot
 *   cross the Next.js Server → Client boundary, so they cannot be passed as
 *   props from a Server Component.
 *
 *   This wrapper is a Client Component that imports `dictionaryConfig` directly
 *   and only exposes `locale` (a plain string) to Server Components.
 *
 * Usage in a Server Component:
 *   import { AppDictionaryProvider } from '@/components/AppDictionaryProvider';
 *   <AppDictionaryProvider locale={locale}>
 *     <ClientNav />
 *   </AppDictionaryProvider>
 */
export function AppDictionaryProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  return (
    <DictionaryProvider config={dictionaryConfig} locale={locale}>
      {children}
    </DictionaryProvider>
  );
}
