# App Settings

App settings let you load a single CMS content item once and make its data available to every component in the application — server components, client components, layout, and pages — without repeated fetching or prop drilling.

## The problem it solves

Many components need site-wide data that lives in the CMS: site name, logo URL, contact details, navigation config, analytics IDs, social links. Without this feature, each component either fetches this data itself (redundant CMS calls) or the data gets prop-drilled through every page route (tight coupling).

## Architecture

```
CMS (settings item — located by path, content type, or key)
        │
        ▼
getAppSettings()       ← unstable_cache (ISR — survives across requests)
        │
   ┌────┴──────────────────────────────────────────┐
   │                                               │
layout.tsx (server)                    AppSettingsProvider
   └─ fetches once, wraps all children     └─ useAppSettings() in any client component
                                              getAppSettings() in any server component
```

Settings are read-only. The data flows in one direction:
```
CMS → getAppSettings() → AppSettingsProvider → components (read only)
```

## Layer separation

| Layer | What lives here |
|---|---|
| **SDK** (`@optimizely/cms-sdk`) | `AppSettingsProvider`, `useAppSettings` — generic React Context plumbing, no assumptions about content shape or CMS path |
| **App** (`src/`) | `appSettings.ts` — source strategy, cache interval, field mapper. `getAppSettings.ts` — the cached fetch resolver. |

## Source strategies

Three mutually exclusive ways to locate the settings item in the CMS. Pick one in `src/appSettings.ts`:

### By URL path
Use when the settings item has a known URL in your CMS.

```ts
source: { by: 'path', path: '/global-settings/' }
```

### By content type
Use when there is a single instance of a dedicated settings content type (e.g. `SiteSettings`). The fetch retrieves the first (and only) item of that type.

```ts
source: { by: 'contentType', contentType: 'SiteSettings' }
```

### By content key
Use when you know the item's unique content key. Optionally scope to a locale.

```ts
source: { by: 'key', key: 'site-settings-root' }
source: { by: 'key', key: 'site-settings-root', locale: 'en-us' }
```

TypeScript enforces that exactly one strategy is configured — the `SettingsSource` discriminated union prevents mixing properties from different strategies.

## Setup

### 1. Configure in `src/appSettings.ts`

```ts
export const appSettingsConfig = {
  source: { by: 'path', path: '/global-settings/' } as SettingsSource,
  revalidate: 3600,   // cache 1 hour; use 0 during development for always-fresh

  mapper: (content) => ({
    siteName:    content.siteName as string,
    logoUrl:     (content.logo as any)?.url as string,
    phone:       content.phone as string,
    email:       content.email as string,
    analyticsId: content.gaTrackingId as string,
  }),
};
```

Without a `mapper`, the full raw CMS content object is stored.

### 2. Layout is already wired (template)

```tsx
// app/layout.tsx
import { AppSettingsProvider } from '@optimizely/cms-sdk/react/client';
import { getAppSettings } from '@/getAppSettings';

export default async function RootLayout({ children }) {
  const settings = await getAppSettings().catch(() => null);
  return (
    <html><body>
      <AppSettingsProvider settings={settings}>
        {children}
      </AppSettingsProvider>
    </body></html>
  );
}
```

`.catch(() => null)` ensures the layout never crashes if the CMS is unreachable.

## Reading settings in components

### Server components

```ts
import { getAppSettings } from '@/getAppSettings';

export async function Footer() {
  const settings = await getAppSettings();   // cache hit — no extra CMS call
  return <footer>{settings?.phone} · {settings?.email}</footer>;
}
```

### Client components

```tsx
'use client';
import { useAppSettings } from '@optimizely/cms-sdk/react/client';

export function Header() {
  const settings = useAppSettings<{ siteName: string; logoUrl: string }>();
  return <header><img src={settings?.logoUrl} alt={settings?.siteName} /></header>;
}
```

## Caching behaviour

| Scenario | Result |
|---|---|
| First request after deploy | CMS fetch occurs, result stored |
| Subsequent requests within `revalidate` window | Served from cache — zero CMS calls |
| After `revalidate` seconds | Stale cache served; re-fetch runs in background |
| After CMS publish | Call `revalidateTag('app-settings')` |

### Cache invalidation webhook

```ts
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { secret, tag } = await req.json();
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  revalidateTag(tag ?? 'app-settings');
  return NextResponse.json({ revalidated: true });
}
```

## Typed wrapper (recommended)

Create a typed wrapper once so every component gets full type safety with no casting:

```ts
// src/useSettings.ts
'use client';
import { useAppSettings } from '@optimizely/cms-sdk/react/client';

export interface SiteSettings {
  siteName: string;
  logoUrl:  string;
  phone:    string;
  email:    string;
}

export function useSettings(): SiteSettings | null {
  return useAppSettings<SiteSettings>();
}
```

## When to use / not use

**Use for:** site name, logo, tagline, contact info, social links, feature flags, analytics IDs — anything CMS-managed that applies to the whole site.

**Do not use for:** data specific to one page (fetch in `page.tsx` instead), data that changes on every request (use `revalidate: 0`), large content trees (map only the scalar fields components need).
