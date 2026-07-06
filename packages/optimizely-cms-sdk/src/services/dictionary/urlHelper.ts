// urlHelper.ts (Inside the shared package)

export const DEFAULT_LOCALE = 'en-us';

/**
 * Extracts the locale from a given URL path based on configured supported locales.
 */
export function extractLocaleFromUrl(
  path: string, 
  supportedLocales: string[], 
  defaultLocale: string = DEFAULT_LOCALE
): string {
  const segments = path.split('/').filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  if (firstSegment && supportedLocales.map(l => l.toLowerCase()).includes(firstSegment)) {
    return firstSegment;
  }

  return defaultLocale;
}

/**
 * Derives the best matching supported locale from an HTTP Accept-Language header.
 *
 * Matching order:
 *   1. Exact match:  "de-de"  → "de-de"
 *   2. Prefix match: "de"     → "de-de"  (first supported locale with that prefix)
 *   3. Fallback:     no match → defaultLocale
 *
 * @example
 *   import { headers } from 'next/headers';
 *   const locale = getLocaleFromAcceptLanguage(
 *     (await headers()).get('accept-language'),
 *     SUPPORTED_LOCALES,
 *   );
 */
export function getLocaleFromAcceptLanguage(
  acceptLanguage: string | null,
  supportedLocales: string[],
  defaultLocale: string = DEFAULT_LOCALE,
): string {
  if (!acceptLanguage) return defaultLocale;

  const requested = acceptLanguage
    .split(',')
    .map(entry => {
      const [lang, qPart] = entry.trim().split(';q=');
      return { lang: lang.trim().toLowerCase().replace('_', '-'), q: qPart ? parseFloat(qPart) : 1 };
    })
    .sort((a, b) => b.q - a.q)
    .map(e => e.lang);

  for (const lang of requested) {
    const exact = supportedLocales.find(l => l === lang);
    if (exact) return exact;

    const prefix = lang.split('-')[0];
    const prefixMatch = supportedLocales.find(l => l.startsWith(prefix + '-'));
    if (prefixMatch) return prefixMatch;
  }

  return defaultLocale;
}