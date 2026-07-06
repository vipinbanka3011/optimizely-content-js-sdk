import { unstable_cache } from 'next/cache';
import { getClient } from '@optimizely/cms-sdk';
import { appSettingsConfig, type SettingsSource } from '@/appSettings';

/**
 * Resolves the CMS content for the configured settings source.
 * Supports three strategies: path, contentType, key.
 */
async function fetchSettingsContent(
  source: SettingsSource,
): Promise<Record<string, unknown> | null> {
  const client = getClient();

  if (source.by === 'path') {
    const result = await client.getContentByPath(source.path);
    return (result[0] as Record<string, unknown>) ?? null;
  }

  if (source.by === 'contentType') {
    const query = `
      query GetSettingsByType($type: String!) {
        _Content(where: { _metadata: { types: { eq: $type } } }, limit: 1) {
          items { _metadata { key url { default } types } }
        }
      }
    `;
    const data = await client.request(query, { type: source.contentType }) as { _Content: { items: Record<string, unknown>[] } };
    return (data._Content?.items?.[0] as Record<string, unknown>) ?? null;
  }

  if (source.by === 'key') {
    const query = `
      query GetSettingsByKey($key: String!, $locale: [Locales]) {
        _Content(where: { _metadata: { key: { eq: $key } } }, locale: $locale, limit: 1) {
          items { _metadata { key url { default } types } }
        }
      }
    `;
    const data = await client.request(query, { key: source.key, locale: source.locale ?? null }) as { _Content: { items: Record<string, unknown>[] } };
    return (data._Content?.items?.[0] as Record<string, unknown>) ?? null;
  }

  return null;
}

/**
 * Fetches app-level CMS settings with ISR caching.
 *
 * The result is cached across requests for appSettingsConfig.revalidate seconds.
 * Stale content is served immediately while a background re-fetch updates the cache.
 *
 * Cache tag: 'app-settings'
 * Invalidate with: revalidateTag('app-settings')  (e.g. from a publish webhook)
 *
 * Server components:
 *   const settings = await getAppSettings();
 *
 * layout.tsx (feeds client components via AppSettingsProvider):
 *   const settings = await getAppSettings().catch(() => null);
 */
export const getAppSettings = unstable_cache(
  async (): Promise<Record<string, unknown> | null> => {
    const raw = await fetchSettingsContent(appSettingsConfig.source);
    if (!raw) return null;
    return appSettingsConfig.mapper ? appSettingsConfig.mapper(raw) : raw;
  },
  ['app-settings'],
  {
    revalidate: appSettingsConfig.revalidate,
    tags: ['app-settings'],
  },
);
