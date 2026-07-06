# Page Context

Page context lets any component — server or client, at any nesting depth — read page-level CMS properties without prop drilling.

## The problem it solves

The SDK fetches the full page content in one GraphQL call and passes each node's data as a `content` prop to the matching component. A nested component (e.g. a `Banner` inside a `LandingSection`) only receives its own slice. If it needs the page title, locale, or any other page-level field, the only option without this feature is to drill props through every intermediate component.

Page context solves this by storing a mapped subset of the page data in two stores simultaneously — one for server components, one for client components.

## How it works

```
page.tsx (server)
│
├── setPageContext(content[0], config)
│     ├── applies mapper → pageData (plain object)
│     ├── writes to React.cache() ← server store
│     └── returns pageData
│
└── <PageDataProvider data={pageData}>   ← client store (React Context)
      └── <OptimizelyComponent ... />
            └── (any depth)
                  ├── ServerComp → getPageData()   reads React.cache()
                  └── ClientComp → usePageData()   reads React Context
```

Both stores hold the same `pageData` object. The mapper runs once on the server only; the result is what gets serialized to the client.

## Setup

### 1. Configure the feature

Create (or update) `src/pageContext.ts` in your application:

```ts
import type { PageContextConfig } from '@optimizely/cms-sdk';

export const pageContextConfig: PageContextConfig = {
  enabled: true,

  // Optional: expose only what your components need.
  // Without a mapper, _metadata, pageType, and top-level scalar fields are stored.
  mapper: (page) => ({
    title:    page.title as string,
    locale:   (page._metadata as any)?.locale as string,
    url:      (page._metadata as any)?.url?.default as string,
    pageType: (page._metadata as any)?.types?.[0] as string,
  }),
};
```

### 2. Wire it in your page route

```tsx
// app/[...slug]/page.tsx
import { setPageContext } from '@optimizely/cms-sdk';
import { PageDataProvider } from '@optimizely/cms-sdk/react/client';
import { pageContextConfig } from '@/pageContext';

export default async function Page({ params }) {
  const content = await client.getContentByPath(...);
  const pageData = setPageContext(content[0], pageContextConfig);

  return pageData ? (
    <PageDataProvider data={pageData}>
      <OptimizelyComponent content={content[0]} />
    </PageDataProvider>
  ) : (
    <OptimizelyComponent content={content[0]} />
  );
}
```

`setPageContext` returns `null` when `enabled: false` — the conditional keeps your JSX clean.

## Reading page data in components

### Server components

```ts
import { getPageData } from '@optimizely/cms-sdk';

export async function Breadcrumb() {
  const page = getPageData<{ title: string; url: string }>();
  if (!page) return null;
  return <nav>{page.title}</nav>;
}
```

### Client components

```tsx
'use client';
import { usePageData } from '@optimizely/cms-sdk/react/client';

export function ShareButton() {
  const page = usePageData<{ title: string; url: string }>();
  return (
    <button onClick={() => navigator.share({ url: page?.url })}>
      Share: {page?.title}
    </button>
  );
}
```

The type parameter `<T>` is optional. Without it, you get `Record<string, unknown>`.

## Per-content-type mappers

Different page types have different fields. Use `mappers` to define type-specific extractors:

```ts
export const pageContextConfig: PageContextConfig = {
  enabled: true,

  mappers: {
    LandingPage: (page) => ({
      title:        page.title as string,
      heroHeadline: (page.hero as any)?.headline as string,
    }),
    BlogPost: (page) => ({
      title:       page.title as string,
      author:      page.author as string,
      publishDate: page.publishDate as string,
    }),
  },

  // Catch-all for any page type not listed above
  mapper: (page) => ({
    title: page.title as string,
  }),
};
```

Resolution order: `mappers[pageType]` → `mapper` → built-in `defaultPageDataMapper`.

## `pageType` field

The built-in `defaultPageDataMapper` always adds a top-level `pageType` field
(shortcut for `_metadata.types[0]`) so you do not need to cast `_metadata`:

```ts
const page = getPageData<{ pageType: string }>();
if (page?.pageType === 'BlogPost') { ... }
```

## Layout-level provider

By default, place `PageDataProvider` in the page component — it unmounts on every navigation, ensuring data is always fresh.

If layout components (nav, sidebar) also need page data, use the cached fetch pattern to avoid a second GraphQL call:

```ts
// src/getPageContent.ts
import { cache } from 'react';
import { getClient } from '@optimizely/cms-sdk';

// React.cache() deduplicates: called from both layout and page = one fetch
export const getPageContent = cache(async (slug: string[]) => {
  const client = getClient();
  const content = await client.getContentByPath(`/${slug.join('/')}/`);
  return (content[0] as Record<string, unknown>) ?? null;
});
```

```tsx
// app/[...slug]/layout.tsx
import { PageDataProvider } from '@optimizely/cms-sdk/react/client';
import { defaultPageDataMapper } from '@optimizely/cms-sdk';
import { getPageContent } from '@/getPageContent';
import { pageContextConfig } from '@/pageContext';

export default async function SlugLayout({ children, params }) {
  const { slug } = await params;
  if (!pageContextConfig.enabled) return <>{children}</>;
  const content = await getPageContent(slug);           // cached
  const mapper = pageContextConfig.mapper ?? defaultPageDataMapper;
  const pageData = mapper(content as Record<string, unknown>);
  return <PageDataProvider data={pageData}>{children}</PageDataProvider>;
}
```

```tsx
// app/[...slug]/page.tsx
const content = await getPageContent(slug);   // cache hit — no re-fetch
setPageContext(content, pageContextConfig);   // feeds server components
return <OptimizelyComponent content={content} />;
// No PageDataProvider here — layout handles it
```

## Performance

| Concern | Detail |
|---|---|
| Server memory | `React.cache()` is request-scoped. Data is GC'd after the response is sent. |
| Client memory | React Context is GC'd when the Provider unmounts (page navigation). |
| Wire size | Controlled by your mapper. The built-in default excludes all nested component data and composition trees. |
| CPU | Mapper runs once per request. `Object.entries` over top-level keys only — negligible. |
| Disabled overhead | When `enabled: false`, `setPageContext` returns `null` immediately. Zero allocations. |

## When to use

- A component needs the page title, locale, URL, SEO metadata, or any page-level scalar without receiving it as a prop.
- Multiple unrelated components on the same page need the same page-level value.
- A client component (e.g. share button, analytics tracker) needs page metadata after hydration.

## When NOT to use

- You need only one specific field in one component — pass it as a prop instead.
- The data changes mid-page (page context is set once per request).
- You need nested component data (hero, sections) — access those through the component's own `content` prop.
