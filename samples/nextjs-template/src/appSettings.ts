/**
 * Application-level settings configuration.
 *
 * Choose ONE source strategy for loading the settings item from CMS:
 *
 *   by: 'path'         — fetch by URL path  (e.g. '/global-settings/')
 *   by: 'contentType'  — fetch by content type name (single instance)
 *   by: 'key'          — fetch by content key, with optional locale
 *
 * ─── Accessing settings ───────────────────────────────────────────────────
 *
 * Server components:
 *   import { getAppSettings } from '@/getAppSettings';
 *   const settings = await getAppSettings();
 *
 * Client components:
 *   'use client';
 *   import { useAppSettings } from '@optimizely/cms-sdk/react/client';
 *   const settings = useAppSettings<{ siteName: string }>();
 *
 * ─── Cache invalidation ───────────────────────────────────────────────────
 * After a CMS publish, call revalidateTag('app-settings') to purge the cache.
 */

/** Load settings by URL path — use when the settings item has a known URL */
type ByPath = { by: 'path'; path: string };

/** Load settings by content type name — use when there is a single instance of this type */
type ByContentType = { by: 'contentType'; contentType: string };

/** Load settings by content key — use when you know the item's unique key */
type ByKey = { by: 'key'; key: string; locale?: string };

export type SettingsSource = ByPath | ByContentType | ByKey;

export const appSettingsConfig = {
  /**
   * How to locate the settings item in the CMS.
   * Pick one strategy and delete the others.
   */
  source: { by: 'path', path: '/global-settings/' } as SettingsSource,
  // source: { by: 'contentType', contentType: 'SiteSettings' } as SettingsSource,
  // source: { by: 'key', key: 'site-settings-root', locale: 'en-us' } as SettingsSource,

  /**
   * ISR revalidation interval in seconds.
   * 0 = always fresh (useful during development).
   */
  revalidate: 3600,

  /**
   * Optional mapper — extract only what your app needs.
   * Without a mapper, the full CMS content object is stored.
   *
   * mapper: (content) => ({
   *   siteName:    content.siteName as string,
   *   logoUrl:     (content.logo as any)?.url as string,
   *   phone:       content.phone as string,
   *   email:       content.email as string,
   *   analyticsId: content.gaTrackingId as string,
   * }),
   */
  mapper: undefined as
    | ((content: Record<string, unknown>) => Record<string, unknown>)
    | undefined,
};
