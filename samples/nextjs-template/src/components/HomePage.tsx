import React from 'react';
import { getDictionary, SUPPORTED_LOCALES } from '@/i18n';
import { AppDictionaryProvider } from '@/components/AppDictionaryProvider';

type Props = {
  locale: string;
};

/**
 * Locale-aware home page.
 *
 * Shared between two routes:
 *   - /          → rendered by app/page.tsx (locale from Accept-Language header)
 *   - /[locale]/ → rendered by app/[...slug]/page.tsx (locale from URL)
 *
 * This keeps both routes in sync without duplicating the UI.
 */
export default async function HomePage({ locale }: Props) {
  const dict = await getDictionary(locale);

  return (
    <AppDictionaryProvider locale={locale}>
      <main className='under-construction'>
        <h1>{dict.t('hero.tagline')}</h1>

        <nav>
          <a href='/'>{dict.t('nav.home')}</a>
          {' · '}
          <a href={`/${locale}/about`}>{dict.t('nav.about')}</a>
          {' · '}
          <a href={`/${locale}/blog`}>{dict.t('nav.blog')}</a>
          {' · '}
          <a href={`/${locale}/contact`}>{dict.t('nav.contact')}</a>
        </nav>

        <p>{dict.t('header.welcome', { name: 'Developer' })}</p>

        <p>
          {dict.t('actions.getStarted')} — visit{' '}
          <code>/[locale]/[slug]</code> to see locale-aware CMS content.
          <br />
          Supported locales: <code>{SUPPORTED_LOCALES.join(' · ')}</code>
        </p>
      </main>
    </AppDictionaryProvider>
  );
}
