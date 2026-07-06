import { getContext, setContext } from './config.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Mapper function signature used in PageContextConfig.
 * Return null to opt this page type out of page context entirely —
 * setPageContext() will return null and no data will be stored or serialized.
 */
export type PageDataMapper<TMapped extends Record<string, unknown> = Record<string, unknown>> =
  (pageContent: Record<string, unknown>) => TMapped | null;

/**
 * Controls what page-level data is stored and made available to components.
 *
 * @template TMapped - Shape of the data returned by the mapper and available
 *   to consumers via getPageData() / usePageData(). Defaults to
 *   Record<string, unknown>.
 *
 * @example Minimal opt-in (metadata + scalars only, default mapper)
 * ```ts
 * export const pageContextConfig: PageContextConfig = { enabled: true };
 * ```
 *
 * @example Custom mapper — expose only what components need
 * ```ts
 * export const pageContextConfig: PageContextConfig<{ title: string; locale: string }> = {
 *   enabled: true,
 *   mapper: (page) => ({
 *     title: page.title as string,
 *     locale: (page._metadata as any)?.locale,
 *   }),
 * };
 * ```
 */
export interface PageContextConfig<
  TMapped extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * Enable page context propagation. Default: false.
   * When false, setPageContext() is a no-op and getPageData() / usePageData()
   * return null — zero overhead.
   */
  enabled?: boolean;

  /**
   * Per-content-type mappers, keyed by the content type name
   * (matches _metadata.types[0] from the GraphQL response).
   *
   * Takes precedence over `mapper` when the page's content type matches a key.
   * Use this when different page types expose different fields.
   * Return null from a mapper to opt that content type out entirely.
   *
   * @example
   * ```ts
   * mappers: {
   *   LandingPage: (page) => ({
   *     title:        page.title as string,
   *     heroHeadline: (page.hero as any)?.headline as string,
   *   }),
   *   SupportPage: () => null,  // opt out — no context on Support pages
   * }
   * ```
   */
  mappers?: Record<string, PageDataMapper<TMapped>>;

  /**
   * Catch-all mapper applied when no entry in `mappers` matches the page type.
   * Also used when `mappers` is not defined at all.
   *
   * Runs on the server only, before anything is written to the request
   * context or serialized to the client. Return a plain, JSON-serializable
   * object — no functions, no circular references.
   *
   * Return null to skip page context for all unmatched page types.
   *
   * When neither `mappers` nor `mapper` is defined, the built-in
   * defaultPageDataMapper is used: _metadata, pageType, and top-level
   * scalar fields only.
   */
  mapper?: PageDataMapper<TMapped>;
}

// ---------------------------------------------------------------------------
// Default mapper
// ---------------------------------------------------------------------------

/**
 * Safe default: extracts _metadata, pageType, and top-level scalar fields.
 * Skips nested objects/arrays (component subtrees, composition nodes, etc.)
 * so the stored payload stays small regardless of page complexity.
 *
 * Always included:
 *   _id       — content key
 *   _metadata — locale, url, types, key, etc.
 *   pageType  — convenience alias for _metadata.types[0]
 *
 * Also included if present at the top level and scalar:
 *   any string / number / boolean field (e.g. title, seoDescription)
 *
 * Never included:
 *   __typename, __context, __composition (internal SDK fields)
 *   nested objects / arrays (hero, sections, composition trees)
 */
export function defaultPageDataMapper(
  content: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (content._metadata !== undefined) {
    result._metadata = content._metadata;
    // Convenience: top-level pageType so components don't need to cast _metadata
    const types = (content._metadata as Record<string, unknown>)?.types;
    if (Array.isArray(types) && types.length > 0) {
      result.pageType = types[0];
    }
  }

  for (const [key, value] of Object.entries(content)) {
    if (key.startsWith('__')) continue; // skip __typename, __context, __composition
    if (key === '_metadata') continue;  // already handled above
    if (key === '_id') {
      result._id = value;
      continue;
    }
    // Only scalar primitives — excludes objects, arrays (component subtrees)
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      result[key] = value;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Server-side API (React.cache / request-scoped)
// ---------------------------------------------------------------------------

/**
 * Populate page-level context from a content object at the page level.
 *
 * - Feeds server components via getPageData().
 * - Returns the mapped data so the caller can pass it to PageDataProvider
 *   to feed client components via usePageData().
 * - Returns null when config.enabled is false — no overhead.
 *
 * Storage uses React.cache() (via the configured context adapter), which is
 * request-scoped. All server components rendered within the same Next.js
 * request can read this data with no prop drilling.
 *
 * @param content  - The page content object from getContentByPath()
 * @param config   - App's PageContextConfig; feature is disabled when omitted
 * @returns Mapped page data (to pass to PageDataProvider), or null if disabled
 *
 * @example
 * ```tsx
 * // app/[...slug]/page.tsx
 * const pageData = setPageContext(content[0], pageContextConfig);
 * return pageData ? (
 *   <PageDataProvider data={pageData}>
 *     <OptimizelyComponent content={content[0]} />
 *   </PageDataProvider>
 * ) : (
 *   <OptimizelyComponent content={content[0]} />
 * );
 * ```
 */
export function setPageContext(
  content: Record<string, unknown>,
  config?: PageContextConfig,
): Record<string, unknown> | null {
  if (!config?.enabled) return null;

  const metadata = content._metadata as Record<string, unknown> | undefined;
  const contentType = (metadata?.types as string[] | undefined)?.[0];

  // Resolution order: mappers[contentType] → mapper → defaultPageDataMapper
  const specificMapper = contentType ? config.mappers?.[contentType] : undefined;
  const mapper = specificMapper ?? config.mapper ?? defaultPageDataMapper;

  const pageData = mapper(content);

  // Mapper returning null means this page type opts out — no context stored
  if (pageData === null) return null;

  setContext({
    currentContent: content,
    key: metadata?.key as string | undefined,
    type: contentType,
    locale: metadata?.locale as string | undefined,
    pageData,
  });

  return pageData;
}

/**
 * Read page-level data in any server component within the same request.
 *
 * Returns null if setPageContext() was not called or the feature is disabled.
 *
 * @example
 * ```ts
 * // Any server component — no props needed
 * const page = getPageData<{ title: string; locale: string }>();
 * ```
 */
export function getPageData<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): T | null {
  return (getContext()?.pageData as T) ?? null;
}
