---
'@optimizely/cms-sdk': minor
'@optimizely/create-app': minor
---

Add DictionaryService for i18n support

- New `DictionaryService` class for lazy-loading locale JSON files with dot-notation translation keys, parameter interpolation, and cascading fallback to a configurable default locale
- New `extractLocaleFromUrl` utility that detects the active locale from the URL path against a consumer-configured list of supported locales
- Both are exported from the root `@optimizely/cms-sdk` package entry point
- `@optimizely/create-app` ships a reference `optimizely.ts` template and 7 starter locale files (en-us, de-de, es-mx, ja-jp, ko-kr, zh-cn, zh-tw)
