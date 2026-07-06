import { describe, it, expect } from 'vitest';
import { extractLocaleFromUrl, getLocaleFromAcceptLanguage, DEFAULT_LOCALE } from './urlHelper.js';

describe('urlHelper', () => {
  describe('DEFAULT_LOCALE constant', () => {
    it('should be "en-us"', () => {
      expect(DEFAULT_LOCALE).toBe('en-us');
    });
  });

  describe('extractLocaleFromUrl', () => {
    const supportedLocales = ['en-us', 'fr', 'de', 'zh-cn', 'es-mx'];

    // ─────────────────────────────────────────
    // Matching locales in the URL
    // ─────────────────────────────────────────
    it('should extract a supported locale from the first path segment', () => {
      expect(extractLocaleFromUrl('/fr/about', supportedLocales)).toBe('fr');
      expect(extractLocaleFromUrl('/de/products', supportedLocales)).toBe('de');
      expect(extractLocaleFromUrl('/zh-cn/home', supportedLocales)).toBe('zh-cn');
    });

    it('should be case-insensitive when matching the locale segment', () => {
      expect(extractLocaleFromUrl('/FR/about', supportedLocales)).toBe('fr');
      expect(extractLocaleFromUrl('/De/products', supportedLocales)).toBe('de');
      expect(extractLocaleFromUrl('/ZH-CN/home', supportedLocales)).toBe('zh-cn');
    });

    it('should match multi-part locale codes like "es-mx"', () => {
      expect(extractLocaleFromUrl('/es-mx/store', supportedLocales)).toBe('es-mx');
    });

    // ─────────────────────────────────────────
    // Fallback behaviour
    // ─────────────────────────────────────────
    it('should return the defaultLocale when the first segment is not a supported locale', () => {
      expect(extractLocaleFromUrl('/about/team', supportedLocales)).toBe(DEFAULT_LOCALE);
      expect(extractLocaleFromUrl('/products', supportedLocales)).toBe(DEFAULT_LOCALE);
    });

    it('should return the defaultLocale for the root path "/"', () => {
      expect(extractLocaleFromUrl('/', supportedLocales)).toBe(DEFAULT_LOCALE);
    });

    it('should return the defaultLocale for an empty string path', () => {
      expect(extractLocaleFromUrl('', supportedLocales)).toBe(DEFAULT_LOCALE);
    });

    it('should return a custom defaultLocale parameter when no match is found', () => {
      expect(extractLocaleFromUrl('/unknown/page', supportedLocales, 'de')).toBe('de');
    });

    it('should return DEFAULT_LOCALE when supportedLocales list is empty', () => {
      expect(extractLocaleFromUrl('/fr/about', [])).toBe(DEFAULT_LOCALE);
    });

    // ─────────────────────────────────────────
    // Only the first segment is evaluated
    // ─────────────────────────────────────────
    it('should only match against the first path segment, not deeper segments', () => {
      expect(extractLocaleFromUrl('/about/fr', supportedLocales)).toBe(DEFAULT_LOCALE);
      expect(extractLocaleFromUrl('/home/de/page', supportedLocales)).toBe(DEFAULT_LOCALE);
    });

    it('should ignore leading slashes correctly and still match', () => {
      expect(extractLocaleFromUrl('/fr', supportedLocales)).toBe('fr');
    });
  });
});

describe('getLocaleFromAcceptLanguage', () => {
  const supportedLocales = ['en-us', 'de-de', 'es-mx', 'zh-cn'];

  it('should return defaultLocale when header is null', () => {
    expect(getLocaleFromAcceptLanguage(null, supportedLocales)).toBe(DEFAULT_LOCALE);
  });

  it('should return defaultLocale when header is empty', () => {
    expect(getLocaleFromAcceptLanguage('', supportedLocales)).toBe(DEFAULT_LOCALE);
  });

  it('should match an exact locale code', () => {
    expect(getLocaleFromAcceptLanguage('de-de', supportedLocales)).toBe('de-de');
    expect(getLocaleFromAcceptLanguage('zh-cn', supportedLocales)).toBe('zh-cn');
  });

  it('should be case-insensitive', () => {
    expect(getLocaleFromAcceptLanguage('DE-DE', supportedLocales)).toBe('de-de');
    expect(getLocaleFromAcceptLanguage('ZH-CN', supportedLocales)).toBe('zh-cn');
  });

  it('should match a language prefix to the first supported locale with that prefix', () => {
    // 'de' → 'de-de'
    expect(getLocaleFromAcceptLanguage('de', supportedLocales)).toBe('de-de');
    // 'zh' → 'zh-cn'
    expect(getLocaleFromAcceptLanguage('zh', supportedLocales)).toBe('zh-cn');
  });

  it('should respect quality weights and pick the highest-priority match', () => {
    // de-de has q=0.9, en-us has q=0.8 — de-de wins
    expect(getLocaleFromAcceptLanguage('fr;q=1.0,de-de;q=0.9,en-us;q=0.8', supportedLocales)).toBe('de-de');
  });

  it('should fall through to the next preference when the first is unsupported', () => {
    // fr is not supported, de-de is — should pick de-de
    expect(getLocaleFromAcceptLanguage('fr,de-de;q=0.9', supportedLocales)).toBe('de-de');
  });

  it('should return defaultLocale when no preference matches', () => {
    expect(getLocaleFromAcceptLanguage('fr,ja', supportedLocales)).toBe(DEFAULT_LOCALE);
  });

  it('should accept a custom defaultLocale parameter', () => {
    expect(getLocaleFromAcceptLanguage('fr', supportedLocales, 'es-mx')).toBe('es-mx');
  });

  it('should handle underscore-separated locale tags (e.g. de_DE)', () => {
    expect(getLocaleFromAcceptLanguage('de_DE', supportedLocales)).toBe('de-de');
  });
});
