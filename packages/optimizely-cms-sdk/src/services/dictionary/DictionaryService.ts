import { extractLocaleFromUrl, DEFAULT_LOCALE } from './urlHelper.js';

export interface DictionaryConfig {
  defaultLocale?: string;
  supportedLocales: string[]; // <-- Configured by the consumer app
  locales: {
    [locale: string]: () => Promise<any>;
  };
}

export class DictionaryService {
  private _locales: DictionaryConfig['locales'];
  private _supportedLocales: string[];
  private _defaultLocale: string;
  private _loadedTranslations: Record<string, any> = {};
  private _currentLocale: string;

  constructor(config: DictionaryConfig) {
    this._locales = config.locales;
    this._defaultLocale = config.defaultLocale || DEFAULT_LOCALE;
    this._supportedLocales = config.supportedLocales;
    this._currentLocale = this._defaultLocale;
  }

  public async init(currentPath?: string): Promise<void> {
    const path = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '/');
    
    // Pass the active configuration dynamically to the helper!
    const matchedLocale = extractLocaleFromUrl(path, this._supportedLocales, this._defaultLocale);
    await this.setLocale(matchedLocale);
  }

  /**
   * Switches the active language, loads the JSON file, and updates state.
   */

  public async setLocale(locale: string): Promise<void> {
    if (!this._locales[locale]) {
      console.warn(`Locale "${locale}" is not configured. Falling back to default.`);
      locale = this._defaultLocale;
    }

    this._currentLocale = locale;
    await this.loadLocaleFile(locale);
    
    // Always pre-load the fallback (en-us) so translations cascade smoothly if a key is missing
    if (locale !== this._defaultLocale) {
      await this.loadLocaleFile(this._defaultLocale);
    }
  }

  /**
   * Translates a dot-notation key (e.g., 'header.welcome').
   */
  public t(keyPath: string, params?: Record<string, string | number>): string {
    // 1. Try active language
    let text = this.getValueByPath(this._currentLocale, keyPath);

    // 2. Cascade fallback to default language
    if (!text && this._currentLocale !== this._defaultLocale) {
      text = this.getValueByPath(this._defaultLocale, keyPath);
    }

    // 3. Worst-case fallback: return raw path
    if (!text) {
      return keyPath;
    }

    // Interpolate placeholders (e.g. "{name}")
    return this.interpolate(text, params);
  }

  /**
   * Helper to retrieve nested object values using dot-notation.
   */
  private getValueByPath(locale: string, path: string): string | null {
    const dict = this._loadedTranslations[locale];
    if (!dict) return null;

    const parts = path.split('.');
    let current = dict;

    for (const part of parts) {
      if (current === null || current === undefined) return null;
      current = current[part];
    }

    return typeof current === 'string' ? current : null;
  }

  /**
   * String interpolation helper.
   */
  private interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) return template;
    return Object.entries(params).reduce((acc, [key, value]) => {
      const regex = new RegExp(`\\{\\s*${key}\\s*\\}`, 'g');
      return acc.replace(regex, String(value));
    }, template);
  }

  /**
   * Loads the language JSON chunks lazily so we don't bloat the bundle size.
   */

  private async loadLocaleFile(locale: string): Promise<void> {
    if (this._loadedTranslations[locale]) return;

    const loadFn = this._locales[locale];
    if (loadFn) {
      try {
        const fileContent = await loadFn();
        // Handle both ES Modules (.default) and standard JSON structures
        this._loadedTranslations[locale] = fileContent.default || fileContent;
      } catch (err) {
        console.error(`Failed to dynamically load locale file: ${locale}`, err);
      }
    }
  }
}