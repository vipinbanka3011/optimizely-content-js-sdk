import { DictionaryService } from '@optimizely/cms-sdk';

// App level configuration (e.g. in nextjs-template)
const dictionaryService = new DictionaryService({
  defaultLocale: 'en-us', // Override default
  supportedLocales: ['en-us', 'zh-cn', 'zh-tw', 'de-de', 'ja-jp', 'ko-kr', 'es-mx'], // Override supported locales
  locales: {
    'en-us': () => import('./locales/en-us.json'),
    'zh-cn': () => import('./locales/zh-cn.json'),
    'zh-tw': () => import('./locales/zh-tw.json'),
    'de-de': () => import('./locales/de-de.json'),
    'ja-jp': () => import('./locales/ja-jp.json'),
    'ko-kr': () => import('./locales/ko-kr.json'),
    'es-mx': () => import('./locales/es-mx.json'),
  }
});