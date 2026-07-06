import type { PageContextConfig } from '@optimizely/cms-sdk';

/**
 * Page context configuration for this application.
 *
 * Set enabled: true to activate page-level data propagation.
 * All components (server and client) will then have access to
 * the mapped page data without prop drilling.
 *
 * ─── Server components ────────────────────────────────────────────────────
 *   import { getPageData } from '@optimizely/cms-sdk';
 *   const page = getPageData<{ title: string; locale: string }>();
 *
 * ─── Client components ────────────────────────────────────────────────────
 *   'use client';
 *   import { usePageData } from '@optimizely/cms-sdk/react/client';
 *   const page = usePageData<{ title: string; locale: string }>();
 *
 * ─── Mapper resolution order ──────────────────────────────────────────────
 *   mappers[pageType]  →  mapper (catch-all)  →  defaultPageDataMapper
 *
 * ─── Opting a page type out ───────────────────────────────────────────────
 *   Return null from a mapper entry to skip page context entirely for that
 *   page type. No data will be stored, PageDataProvider will not wrap, and
 *   getPageData() / usePageData() return null on those pages.
 */
export const pageContextConfig: PageContextConfig = {
  /**
   * Disabled by default. Set to true to activate.
   * When false: setPageContext() is a no-op, getPageData() / usePageData()
   * return null — zero runtime overhead.
   */
  enabled: false,

  /**
   * Per-content-type mappers — keyed by _metadata.types[0].
   *
   * Three patterns:
   *
   *   LandingPage  → custom mapper (specific fields for this type)
   *   BlogPost     → custom mapper (different fields)
   *   SupportPage  → () => null  (opt out — no context on these pages)
   *
   * Example:
   *
   * mappers: {
   *   LandingPage: (page) => ({
   *     title:        page.title as string,
   *     locale:       (page._metadata as any)?.locale as string,
   *     heroHeadline: (page.hero as any)?.headline as string,
   *   }),
   *
   *   BlogPost: (page) => ({
   *     title:       page.title as string,
   *     author:      page.author as string,
   *     publishDate: page.publishDate as string,
   *   }),
   *
   *   SupportPage: () => null,   // ← no page context on Support pages
   * },
   */
  // mappers: { ... },

  /**
   * Catch-all mapper — applies to any page type not listed in mappers.
   * Return null here to opt out ALL page types except those with a
   * specific entry in mappers above.
   *
   * Example (only named types above get context, everything else is skipped):
   *   mapper: () => null,
   *
   * Without either mapper, _metadata, pageType, and top-level scalar
   * fields are stored automatically by the built-in default.
   */
  // mapper: (page) => ({
  //   title:    page.title as string,
  //   locale:   (page._metadata as any)?.locale as string,
  //   pageType: (page._metadata as any)?.types?.[0] as string,
  // }),
};
