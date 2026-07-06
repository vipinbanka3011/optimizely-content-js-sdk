import { cache } from 'react';
import { getClient } from '@optimizely/cms-sdk';

/**
 * Fetches page content for a given slug and memoizes the result for the
 * duration of the current server request using React.cache().
 *
 * Calling this from both generateMetadata() and the Page component with
 * the same slug produces exactly ONE GraphQL round-trip — React deduplicates
 * automatically.
 *
 * ─── Usage ────────────────────────────────────────────────────────────────
 *
 *   // app/[...slug]/page.tsx
 *   import { getPageContent } from '@/getPageContent';
 *
 *   export async function generateMetadata({ params }) {
 *     const { slug } = await params;
 *     const content = await getPageContent(slug);
 *     return generateCmsMetadata(content ?? {});
 *   }
 *
 *   export default async function Page({ params }) {
 *     const { slug } = await params;
 *     const content = await getPageContent(slug);  // cache hit — no re-fetch
 *     if (!content) notFound();
 *     return <OptimizelyComponent content={content} />;
 *   }
 */
export const getPageContent = cache(async (slug: string[]): Promise<Record<string, unknown> | null> => {
  const client = getClient();
  const content = await client.getContentByPath(`/${slug.join('/')}/`);
  return (content[0] as Record<string, unknown>) ?? null;
});
