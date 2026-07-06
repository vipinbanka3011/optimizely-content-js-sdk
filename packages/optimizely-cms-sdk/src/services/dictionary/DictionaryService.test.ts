import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DictionaryService, type DictionaryConfig } from './DictionaryService.js';

// ─────────────────────────────────────────────
// 1. Mock the updated urlHelper module
// ─────────────────────────────────────────────
vi.mock('./urlHelper.js', () => ({
  DEFAULT_LOCALE: 'en-us',
  // Simulate the new signature that takes dynamic configuration arguments
  extractLocaleFromUrl: vi.fn((path: string, supportedLocales: string[], defaultLocale: string = 'en-us') => {
    const segments = path.split('/').filter(Boolean);
    const firstSegment = segments[0]?.toLowerCase();

    if (firstSegment && supportedLocales.map(l => l.toLowerCase()).includes(firstSegment)) {
      return firstSegment;
    }
    return defaultLocale;
  }),
}));

import { extractLocaleFromUrl } from './urlHelper.js';

// ─────────────────────────────────────────────
// Sample mock translation data
// ─────────────────────────────────────────────
const enTranslations = {
  header: { welcome: 'Welcome', title: 'Home Page' },
  common: { submit: 'Submit' },
};

const frTranslations = {
  header: { welcome: 'Bienvenue' },
};

const deTranslations = {
  header: { welcome: 'Willkommen' },
};

// ─────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────
describe('DictionaryService (Option 1: Dependency Injection Configuration)', () => {
  let mockEnLoader: any;
  let mockFrLoader: any;
  let mockDeLoader: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEnLoader = vi.fn().mockResolvedValue(enTranslations);
    mockFrLoader = vi.fn().mockResolvedValue(frTranslations);
    mockDeLoader = vi.fn().mockResolvedValue(deTranslations);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────
  // A. Default Configuration Verification
  // ─────────────────────────────────────────
  describe('Default Configuration fallback', () => {
    it('should fall back to "en-us" as defaultLocale if omitted in config', async () => {
      const service = new DictionaryService({
        supportedLocales: ['en-us', 'fr'],
        locales: {
          'en-us': mockEnLoader,
          'fr': mockFrLoader,
        },
      });

      await service.init('/fr/about');

      // Default locale 'en-us' should be passed automatically to the extractor helper
      expect(extractLocaleFromUrl).toHaveBeenCalledWith('/fr/about', ['en-us', 'fr'], 'en-us');
    });
  });

  // ─────────────────────────────────────────
  // B. Overridden Configuration Verification
  // ─────────────────────────────────────────
  describe('Custom Configuration overrides', () => {
    it('should use overridden defaultLocale and supportedLocales in init()', async () => {
      const service = new DictionaryService({
        defaultLocale: 'de', // Custom default
        supportedLocales: ['de', 'fr'], // Custom supported list
        locales: {
          'de': mockDeLoader,
          'fr': mockFrLoader,
        },
      });

      await service.init('/fr/about');

      // Verify extractLocaleFromUrl received custom parameters
      expect(extractLocaleFromUrl).toHaveBeenCalledWith(
        '/fr/about',
        ['de', 'fr'],
        'de'
      );
      // 'fr' is matching in the custom supportedLocales list
      expect(mockFrLoader).toHaveBeenCalledTimes(1);
    });

    it('should fallback to custom defaultLocale when trying to access unsupported path segment', async () => {
      const service = new DictionaryService({
        defaultLocale: 'de',
        supportedLocales: ['de', 'fr'],
        locales: {
          'de': mockDeLoader,
          'fr': mockFrLoader,
        },
      });

      // 'en' is not in supportedLocales list ['de', 'fr']
      await service.init('/en/about'); 

      // Extractor helper should resolve the custom defaultLocale ('de')
      expect(mockDeLoader).toHaveBeenCalledTimes(1); 
      expect(mockFrLoader).not.toHaveBeenCalled();
    });

    it('should fall back to the custom defaultLocale during setLocale validation warnings', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const service = new DictionaryService({
        defaultLocale: 'de',
        supportedLocales: ['de', 'fr'],
        locales: {
          'de': mockDeLoader,
          'fr': mockFrLoader,
        },
      });

      await service.setLocale('unsupported-locale');

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Falling back to default'));
      expect(mockDeLoader).toHaveBeenCalledTimes(1); // Loaded custom default
    });
  });

  // ─────────────────────────────────────────
  // C. Translation cascading under customized defaultLocale
  // ─────────────────────────────────────────
  describe('Translation cascading with custom defaultLocale', () => {
    it('should cascade translation lookups to custom defaultLocale (de) instead of (en-us)', async () => {
      // Setup: 'header.title' exists in 'de' but not in 'fr'
      const customDeTranslations = {
        header: { title: 'Deutsche Startseite' }
      };
      mockDeLoader.mockResolvedValue(customDeTranslations);

      const service = new DictionaryService({
        defaultLocale: 'de',
        supportedLocales: ['de', 'fr'],
        locales: {
          'de': mockDeLoader,
          'fr': mockFrLoader,
        },
      });

      await service.setLocale('fr'); // Loads 'fr' and custom default 'de'
      
      // Look up 'header.title' which is missing in 'fr'
      const title = service.t('header.title');

      expect(title).toBe('Deutsche Startseite'); // Successfully cascaded to 'de'!
      expect(mockDeLoader).toHaveBeenCalledTimes(1);
    });
  });
});