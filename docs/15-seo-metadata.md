# SEO Metadata

The SDK provides a `generateCmsMetadata` helper that extracts SEO data from a CMS content object and returns a Next.js `Metadata` object — ready to return directly from `generateMetadata()` in your page routes.

## How it works

```
generateMetadata() in page route
│
└── getPageContent(slug)          ← React.cache — shared with Page, no extra fetch
      │
      └── generateCmsMetadata(content, config)
            ├── resolves title, description, og:*, twitter:*, robots, canonical
            │   from CMS field names (tries common names, first match wins)
            └── returns Next.js Metadata object
```

## Setup

### 1. Add to your page route

```tsx
// app/[...slug]/page.tsx
import type { Metadata } from 'next';
import { generateCmsMetadata } from '@optimizely/cms-sdk/next';
import { getPageContent } from '@/getPageContent';

export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const content = await getPageContent(slug);   // React.cache — no extra network call
  if (!content) return {};
  return generateCmsMetadata(content, {
    titleSuffix: ' | Acme Corp',
  });
}

export default async function Page({ params }) {
  const { slug } = await params;
  const content = await getPageContent(slug);   // cache hit
  // ...
}
```

`getPageContent` wraps the GraphQL fetch in `React.cache()`. Calling it from both `generateMetadata` and the page component results in exactly one network round-trip per request.

## Default field resolution

For each metadata property, the helper tries a list of common CMS field names in order. The first non-empty match wins.

| Metadata property | Default field names tried (in order) |
|---|---|
| `title` | `seoTitle`, `metaTitle`, `title`, `name`, `heading` |
| `description` | `seoDescription`, `metaDescription`, `description`, `summary`, `excerpt` |
| `og:title` | `ogTitle`, `openGraphTitle` → falls back to resolved title |
| `og:description` | `ogDescription`, `openGraphDescription` → falls back to description |
| `og:image` | `ogImage`, `openGraphImage`, `socialImage`, `heroImage`, `image` |
| `twitter:title` | `twitterTitle` → falls back to og:title |
| `twitter:description` | `twitterDescription` → falls back to og:description |
| `twitter:image` | `twitterImage` → falls back to og:image |
| `canonical` | `canonicalUrl`, `canonical` → falls back to `_metadata.url.default` |
| `noIndex` | `noIndex`, `hideFromSearch`, `searchHide`, `noindex` |
| `noFollow` | `noFollow`, `nofollow` |
| `keywords` | `keywords`, `seoKeywords`, `metaKeywords` |

Image fields can be a plain URL string or an object with a `url` property.

## Overriding field names

If your CMS uses different field names, override them via `fields`:

```ts
return generateCmsMetadata(content, {
  fields: {
    title:       ['pageTitle', 'heading'],   // try these instead of defaults
    description: 'summary',                  // single field name
    ogImage:     'socialShareImage',
    noIndex:     'excludeFromSearch',
  },
  titleSuffix: ' | Acme Corp',
});
```

## Static overrides

```ts
generateCmsMetadata(content, {
  titleSuffix:        ' | Acme Corp',          // appended: "Home | Acme Corp"
  titlePrefix:        'Blog – ',               // prepended: "Blog – My Post"
  fallbackTitle:      'Home',                  // used if no title field found
  fallbackDescription:'Welcome to Acme Corp',
  siteUrl:            'https://www.acme.com',  // resolves relative image/canonical URLs
})
```

## Custom meta tags

Use `additional` for any `<meta>` tag not covered above:

```ts
generateCmsMetadata(content, {
  additional: {
    'theme-color':      '#0070f3',
    'application-name': 'Acme App',
    'format-detection': 'telephone=no',
  },
})
```

These map to `metadata.other` in Next.js, which renders as `<meta name="..." content="...">`.

## robots / noIndex

When the resolved `noIndex` field is truthy, `robots: { index: false }` is set automatically. Same for `noFollow`. No manual configuration needed.

## Per-page-type metadata

Different content types often have different SEO fields. Call `generateCmsMetadata` with type-specific config by reading `pageType` first:

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const content = await getPageContent(slug);
  if (!content) return {};

  const pageType = (content._metadata as any)?.types?.[0];

  if (pageType === 'BlogPost') {
    return generateCmsMetadata(content, {
      fields: { title: 'postTitle', description: 'excerpt', ogImage: 'coverImage' },
      titleSuffix: ' | Blog',
    });
  }

  return generateCmsMetadata(content, { titleSuffix: ' | Acme Corp' });
}
```

## What generateCmsMetadata sets

```
<title>              from title + suffix/prefix
<meta description>   from description
<link rel=canonical> from canonical / _metadata.url.default
<meta robots>        when noIndex or noFollow is truthy
<meta og:*>          title, description, url, images
<meta twitter:*>     card, title, description, images
<meta name=keywords> from keywords (comma-separated → array)
<meta name="...">    from additional{}
```

## Note on component-level metadata

Next.js App Router does not support setting `<head>` tags from inside components — metadata must be declared at the route segment level (`page.tsx` or `layout.tsx`) via `generateMetadata`. This is by design: the page route already has the full content object available, so all SEO data can be extracted there without the need for components to push tags up the tree.
