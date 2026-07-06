import { cache } from 'react';
import { getClient } from '@optimizely/cms-sdk';

/**
 * Fetches page content for a given slug and memoizes the result for the
 * duration of the current server request using React.cache().
 *
 * Calling this from both layout.tsx and page.tsx with the same slug produces
 * exactly ONE GraphQL round-trip — React deduplicates automatically.
 *
 * ─── Why this exists ──────────────────────────────────────────────────────
 * The layout-level PageDataProvider pattern needs the page content in the
 * layout (so layout components like nav/sidebar can call usePageData()), but
 * the page also needs the same content to render OptimizelyComponent.
 * Sharing this cached function means no duplicate network calls.
 *
 * ─── Usage (page-level, simpler) ──────────────────────────────────────────
 * Most apps should fetch directly in page.tsx and NOT use this file.
 * See samples/nextjs-template/src/app/[...slug]/page.tsx.
 *
 * ─── Usage (layout-level PageDataProvider) ────────────────────────────────
 * Step 1 — create app/[...slug]/layout.tsx:
 *
 *   import { PageDataProvider } from '@optimizely/cms-sdk/react/client';
 *   import { getPageContent } from '@/getPageContent';
 *   import { pageContextConfig } from '@/pageContext';
 *   import { defaultPageDataMapper } from '@optimizely/cms-sdk';
 *
 *   export default async function SlugLayout({ children, params }) {
 *     const { slug } = await params;
 *     if (!pageContextConfig.enabled) return <>{children}</>;
 *     const content = await getPageContent(slug);   // cached — no extra fetch
 *     const mapper = pageContextConfig.mapper ?? defaultPageDataMapper;
 *     const pageData = mapper(content as Record<string, unknown>);
 *     return <PageDataProvider data={pageData}>{children}</PageDataProvider>;
 *   }
 *
 * Step 2 — in app/[...slug]/page.tsx, replace getContentByPath with:
 *
 *   const content = await getPageContent(slug);   // cache hit — no re-fetch
 *   setPageContext(content, pageContextConfig);    // SSR server components
 *   return <OptimizelyComponent content={content} />;
 *   // No PageDataProvider here — layout handles it
 */
export const getPageContent = cache(async (slug: string[]): Promise<Record<string, unknown> | null> => {
  const client = getClient();
  const content = await client.getContentByPath(`/${slug.join('/')}/`);
  return (content[0] as Record<string, unknown>) ?? null;
});
