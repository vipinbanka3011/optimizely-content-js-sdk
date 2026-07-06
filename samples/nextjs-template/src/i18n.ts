import { DictionaryService, type DictionaryConfig, getLocaleFromAcceptLanguage } from '@optimizely/cms-sdk';

export { getLocaleFromAcceptLanguage };

/**
 * Locale codes recognised in URL paths (e.g. /de-de/home, /zh-cn/products).
 * The first path segment is compared against this list verbatim.
 */
export const SUPPORTED_LOCALES = ['en-us', 'de-de', 'es-mx', 'ja-jp', 'ko-kr', 'zh-cn', 'zh-tw'];

export const DEFAULT_LOCALE = 'en-us';

/**
 * Shared locale loader config. Exported so the client-side DictionaryProvider
 * can reuse it without duplicating the loader functions.
 * The loader functions are defined once — module caching ensures each JSON
 * file is only fetched once per process (server) or page load (client).
 */
export const dictionaryConfig: DictionaryConfig = {
  defaultLocale: DEFAULT_LOCALE,
  supportedLocales: SUPPORTED_LOCALES,
  locales: {
    'en-us': () => import('./locales/en-us.json'),
    'de-de': () => import('./locales/de-de.json'),
    'es-mx': () => import('./locales/es-mx.json'),
    'ja-jp': () => import('./locales/ja-jp.json'),
    'ko-kr': () => import('./locales/ko-kr.json'),
    'zh-cn': () => import('./locales/zh-cn.json'),
    'zh-tw': () => import('./locales/zh-tw.json'),
  },
};

/**
 * Returns a DictionaryService instance loaded for the given locale.
 *
 * Call once per server request — each call produces its own instance so
 * concurrent requests can never race on shared mutable state.
 *
 * Usage in a Next.js server component:
 *   const dict = await getDictionary('de-de');
 *   dict.t('nav.contact')              // → "Kontakt"
 *   dict.t('header.welcome', { name: 'Alice' }) // → "Willkommen zurück, Alice"
 */
export async function getDictionary(locale: string): Promise<DictionaryService> {
  const dict = new DictionaryService(dictionaryConfig);
  await dict.setLocale(locale);
  return dict;
}
