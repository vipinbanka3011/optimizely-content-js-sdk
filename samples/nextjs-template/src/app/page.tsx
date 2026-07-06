import { headers } from 'next/headers';
import { getLocaleFromAcceptLanguage, SUPPORTED_LOCALES } from '@/i18n';
import HomePage from '@/components/HomePage';

export default async function Home() {
  // No locale in the root path — detect from the browser's Accept-Language header
  const locale = getLocaleFromAcceptLanguage((await headers()).get('accept-language'), SUPPORTED_LOCALES);

  return <HomePage locale={locale} />;
}
