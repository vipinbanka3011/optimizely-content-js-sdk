// Server-side only — import from '@optimizely/cms-sdk/next'
// @ts-ignore - next is an optional peer dependency
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Maps metadata property names to one or more CMS field names.
 * The first field that is present and non-empty in the content wins.
 * Use an array to define a priority-ordered list of fallbacks.
 *
 * @example
 * ```ts
 * fields: {
 *   title:       ['seoTitle', 'pageTitle'],  // try seoTitle first, then pageTitle
 *   description: 'metaDesc',                 // single field name
 * }
 * ```
 */
export interface CmsMetadataFieldMap {
  title?:              string | string[];
  description?:        string | string[];
  ogTitle?:            string | string[];
  ogDescription?:      string | string[];
  /** CMS field containing the OG/share image URL or an object with a `url` property. */
  ogImage?:            string | string[];
  twitterTitle?:       string | string[];
  twitterDescription?: string | string[];
  twitterImage?:       string | string[];
  canonical?:          string | string[];
  /**
   * Boolean or truthy CMS field that hides this page from search engines.
   * When truthy, sets `robots: { index: false }`.
   */
  noIndex?:            string | string[];
  noFollow?:           string | string[];
  keywords?:           string | string[];
}

/**
 * Configuration for generateCmsMetadata().
 */
export interface CmsMetadataConfig {
  /**
   * Override the default CMS field names for each metadata property.
   * Any property not specified falls back to the built-in defaults.
   */
  fields?: CmsMetadataFieldMap;

  /** Appended to the resolved title. E.g. ' | Acme Corp' */
  titleSuffix?: string;

  /** Prepended to the resolved title. */
  titlePrefix?: string;

  /** Used when no title field is found in the content. */
  fallbackTitle?: string;

  /** Used when no description field is found in the content. */
  fallbackDescription?: string;

  /**
   * Base URL for resolving relative canonical and image URLs.
   * E.g. 'https://www.example.com' (no trailing slash).
   */
  siteUrl?: string;

  /**
   * Additional arbitrary <meta> tags to merge in.
   * Key = name attribute, value = content attribute.
   * E.g. { 'theme-color': '#ffffff', 'application-name': 'My App' }
   */
  additional?: Record<string, string>;

  /**
   * Optional post-processing function called after the helper has resolved
   * all metadata. Receives the original CMS content and the resolved Metadata
   * object, and must return the final Metadata to use.
   *
   * Use this to override specific properties, add fields the helper doesn't
   * cover, or conditionally adjust values — without losing everything the
   * helper already resolved.
   *
   * @example Override one property
   * ```ts
   * transform: (content, metadata) => ({
   *   ...metadata,
   *   title: `${content.category} – ${metadata.title}`,
   * })
   * ```
   *
   * @example Add article Open Graph type
   * ```ts
   * transform: (content, metadata) => ({
   *   ...metadata,
   *   openGraph: {
   *     ...metadata.openGraph,
   *     type: (content._metadata as any)?.types?.[0] === 'BlogPost' ? 'article' : 'website',
   *   },
   * })
   * ```
   *
   * @example Full override (use your own logic, skip the helper's output)
   * ```ts
   * transform: (content, _) => ({
   *   title: content.myTitle as string,
   *   description: content.mySummary as string,
   * })
   * ```
   */
  transform?: (
    content: Record<string, unknown>,
    metadata: Metadata,
  ) => Metadata;
}

// ---------------------------------------------------------------------------
// Internal defaults
// ---------------------------------------------------------------------------

const DEFAULTS: Required<CmsMetadataFieldMap> = {
  title:              ['seoTitle', 'metaTitle', 'title', 'name', 'heading'],
  description:        ['seoDescription', 'metaDescription', 'description', 'summary', 'excerpt'],
  ogTitle:            ['ogTitle', 'openGraphTitle'],
  ogDescription:      ['ogDescription', 'openGraphDescription'],
  ogImage:            ['ogImage', 'openGraphImage', 'socialImage', 'heroImage', 'image'],
  twitterTitle:       ['twitterTitle'],
  twitterDescription: ['twitterDescription'],
  twitterImage:       ['twitterImage'],
  canonical:          ['canonicalUrl', 'canonical'],
  noIndex:            ['noIndex', 'hideFromSearch', 'searchHide', 'noindex'],
  noFollow:           ['noFollow', 'nofollow'],
  keywords:           ['keywords', 'seoKeywords', 'metaKeywords'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** Returns the first non-empty string value found for any of the given field names. */
function resolveField(
  content: Record<string, unknown>,
  userFields: string | string[] | undefined,
  defaultFields: string | string[],
): string | null {
  const candidates = [...toArray(userFields), ...toArray(defaultFields)];
  for (const field of candidates) {
    const raw = content[field];
    if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
    // Support objects with a nested `url` property (e.g. image references)
    if (raw && typeof raw === 'object' && 'url' in raw) {
      const url = (raw as Record<string, unknown>).url;
      if (typeof url === 'string' && url.trim() !== '') return url.trim();
    }
  }
  return null;
}

function resolveBoolean(
  content: Record<string, unknown>,
  userFields: string | string[] | undefined,
  defaultFields: string | string[],
): boolean {
  const candidates = [...toArray(userFields), ...toArray(defaultFields)];
  for (const field of candidates) {
    const raw = content[field];
    if (raw !== undefined && raw !== null) return Boolean(raw);
  }
  return false;
}

function resolveUrl(raw: string | null, siteUrl?: string): string | null {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (siteUrl) return `${siteUrl.replace(/\/$/, '')}/${raw.replace(/^\//, '')}`;
  return raw;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extracts SEO metadata from a CMS content object and returns a Next.js
 * `Metadata` object, ready to return from `generateMetadata()`.
 *
 * Field name resolution order for each property:
 *   config.fields.X  →  built-in defaults  →  null
 *
 * Values derived from `_metadata` (locale, url) are used as last-resort
 * fallbacks for description and canonical URL.
 *
 * @param content  - Raw CMS content object from getContentByPath()
 * @param config   - Optional overrides for field names and static values
 * @returns        Next.js Metadata object
 *
 * @example
 * ```ts
 * // app/[...slug]/page.tsx
 * import { generateCmsMetadata } from '@optimizely/cms-sdk/next';
 * import { getPageContent } from '@/getPageContent';
 *
 * export async function generateMetadata({ params }) {
 *   const { slug } = await params;
 *   const content = await getPageContent(slug);
 *   if (!content) return {};
 *   return generateCmsMetadata(content, { titleSuffix: ' | Acme Corp' });
 * }
 * ```
 */
export function generateCmsMetadata(
  content: Record<string, unknown>,
  config: CmsMetadataConfig = {},
): Metadata {
  const { fields = {}, titleSuffix = '', titlePrefix = '', siteUrl, additional, transform } = config;

  // ── Resolve raw values ──────────────────────────────────────────────────

  const metadataObj = content._metadata as Record<string, unknown> | undefined;
  const metaUrl = metadataObj?.url;
  const metaUrlDefault =
    metaUrl && typeof metaUrl === 'object' && 'default' in metaUrl
      ? String((metaUrl as Record<string, unknown>).default)
      : typeof metaUrl === 'string'
        ? metaUrl
        : null;

  const rawTitle = resolveField(content, fields.title, DEFAULTS.title)
    ?? config.fallbackTitle
    ?? null;

  const rawDescription = resolveField(content, fields.description, DEFAULTS.description)
    ?? config.fallbackDescription
    ?? null;

  const rawOgTitle       = resolveField(content, fields.ogTitle,            DEFAULTS.ogTitle)       ?? rawTitle;
  const rawOgDescription = resolveField(content, fields.ogDescription,      DEFAULTS.ogDescription) ?? rawDescription;
  const rawOgImage       = resolveField(content, fields.ogImage,            DEFAULTS.ogImage);
  const rawTwitterTitle  = resolveField(content, fields.twitterTitle,       DEFAULTS.twitterTitle)  ?? rawOgTitle;
  const rawTwitterDesc   = resolveField(content, fields.twitterDescription, DEFAULTS.twitterDescription) ?? rawOgDescription;
  const rawTwitterImage  = resolveField(content, fields.twitterImage,       DEFAULTS.twitterImage)  ?? rawOgImage;
  const rawCanonical     = resolveField(content, fields.canonical,          DEFAULTS.canonical)     ?? metaUrlDefault;
  const rawKeywords      = resolveField(content, fields.keywords,           DEFAULTS.keywords);
  const noIndex          = resolveBoolean(content, fields.noIndex,          DEFAULTS.noIndex);
  const noFollow         = resolveBoolean(content, fields.noFollow,         DEFAULTS.noFollow);

  // ── Build title ──────────────────────────────────────────────────────────
  const title = rawTitle
    ? `${titlePrefix}${rawTitle}${titleSuffix}`
    : undefined;

  // ── Build Metadata ───────────────────────────────────────────────────────
  const metadata: Metadata = {};

  if (title)          metadata.title = title;
  if (rawDescription) metadata.description = rawDescription;

  if (rawKeywords) {
    metadata.keywords = rawKeywords.includes(',')
      ? rawKeywords.split(',').map((k) => k.trim())
      : rawKeywords;
  }

  // Canonical
  const canonical = resolveUrl(rawCanonical, siteUrl);
  if (canonical) {
    metadata.alternates = { canonical };
  }

  // Robots
  if (noIndex || noFollow) {
    metadata.robots = {
      index:  !noIndex,
      follow: !noFollow,
    };
  }

  // Open Graph
  const ogImage = resolveUrl(rawOgImage, siteUrl);
  metadata.openGraph = {
    ...(title          && { title:       rawOgTitle ?? title }),
    ...(rawOgDescription && { description: rawOgDescription }),
    ...(ogImage        && { images:      [{ url: ogImage }] }),
    ...(canonical      && { url:         canonical }),
  };

  // Twitter
  const twitterImage = resolveUrl(rawTwitterImage, siteUrl);
  metadata.twitter = {
    card:        twitterImage ? 'summary_large_image' : 'summary',
    ...(rawTwitterTitle && { title:       rawTwitterTitle }),
    ...(rawTwitterDesc  && { description: rawTwitterDesc }),
    ...(twitterImage    && { images:      [twitterImage] }),
  };

  // Custom additional tags
  if (additional && Object.keys(additional).length > 0) {
    metadata.other = { ...additional };
  }

  // Post-processing: let the caller override or extend the resolved metadata
  return transform ? transform(content, metadata) : metadata;
}
