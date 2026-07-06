'use client';
import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  type ReactNode,
  type FunctionComponent,
  type PropsWithChildren,
} from 'react';
import { DictionaryService, type DictionaryConfig } from '../services/dictionary/DictionaryService.js';

interface ContentSavedEvent {
  contentLink: string;
  editUrl?: string;
  previewUrl: string;
  previewToken: string;
}

/**
 * Callback for handling navigation/refresh when content is saved.
 * @param url - Target URL to navigate to
 * @param isSameUrl - True if URL matches current location (refresh), false if different (navigate)
 */
export type NavigateCallback = (url: string, isSameUrl: boolean) => void | Promise<void>;

export interface PreviewComponentProps {
  /**
   * Custom navigation handler. If not provided, uses window.location.replace.
   * @example Next.js
   * const router = useRouter();
   * <PreviewComponent onNavigate={(url, isSameUrl) => {
   *   if (isSameUrl) {
   *     router.refresh();
   *   } else {
   *     const parsed = new URL(url);
   *     router.push(parsed.pathname + parsed.search);
   *   }
   * }} />
   */
  onNavigate?: NavigateCallback;

  /**
   * Delay in ms before triggering navigation. False to disable.
   * Useful for debouncing rapid saves.
   * @default 300
   */
  refreshTimeout?: number | false;

  /**
   * Optional loading indicator shown during refresh delay.
   */
  children?: ReactNode;
}

/**
 * Listens for Optimizely CMS content saved events and triggers navigation/refresh.
 * Deduplication prevents duplicate refreshes.
 */
export const PreviewComponent: FunctionComponent<
  PropsWithChildren<PreviewComponentProps>
> = ({ onNavigate, refreshTimeout = 300, children }) => {
  const [showMask, setShowMask] = useState<boolean>(false);
  const reloadDelay = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastProcessedRef = useRef<{ contentLink: string; timestamp: number } | null>(
    null,
  );

  useEffect(() => {
    const normalizeUrl = (url: string): string => {
      const parsed = new URL(url);
      parsed.pathname = parsed.pathname.replace(/\/$/, '') || '/';
      return parsed.toString();
    };

    const handleContentSaved = (eventData: ContentSavedEvent) => {
      const now = Date.now();

      // Ignore same contentLink within 50ms (deduplication for dual events)
      if (
        lastProcessedRef.current &&
        lastProcessedRef.current.contentLink === eventData.contentLink &&
        now - lastProcessedRef.current.timestamp < 50
      ) {
        return;
      }

      lastProcessedRef.current = { contentLink: eventData.contentLink, timestamp: now };

      const currentUrl = window.location.href;

      setShowMask(true);

      if (reloadDelay.current) clearTimeout(reloadDelay.current);

      let finalUrl: string;
      try {
        const url = new URL(eventData.previewUrl, window.location.origin);
        finalUrl = url.toString();
      } catch {
        finalUrl = eventData.previewUrl;
      }

      const isSameUrl = normalizeUrl(currentUrl) === normalizeUrl(finalUrl);

      const executeNavigation = () => {
        if (onNavigate) {
          Promise.resolve(onNavigate(finalUrl, isSameUrl)).finally(() =>
            setShowMask(false),
          );
        } else {
          // Fallback: hard reload
          window.location.replace(finalUrl);
        }
      };

      if (refreshTimeout) {
        reloadDelay.current = setTimeout(executeNavigation, refreshTimeout);
      } else {
        executeNavigation();
      }
    };

    const customEventListener = (event: Event) =>
      handleContentSaved((event as CustomEvent).detail as ContentSavedEvent);

    window.addEventListener('optimizely:cms:contentSaved', customEventListener);

    return () => {
      window.removeEventListener('optimizely:cms:contentSaved', customEventListener);
      if (reloadDelay.current) clearTimeout(reloadDelay.current);
    };
  }, [onNavigate, refreshTimeout]);

  return showMask && children ? <>{children}</> : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// DictionaryProvider — shares one DictionaryService instance across all client
// components in the subtree via React Context.
// ─────────────────────────────────────────────────────────────────────────────

// Internal wrapper — a new object is created on every locale switch so React
// context always sees a reference change and notifies all consumers.
type DictionaryHandle = { instance: DictionaryService };
const DictionaryContext = createContext<DictionaryHandle | null>(null);

export interface DictionaryProviderProps {
  /** App-level DictionaryConfig defining supported locales and their loaders. */
  config: DictionaryConfig;
  /**
   * Active locale code (e.g. 'de-de').
   *
   * Supports two usage patterns:
   *  - Per-page: place inside each page component. Provider remounts on every
   *    navigation and always gets a fresh instance.
   *  - In layout: place once in the root layout. When this prop changes (e.g.
   *    user switches locale in-place), the existing service instance calls
   *    setLocale() and a new context handle is published so all consumers
   *    re-render with the updated translations.
   */
  locale: string;
  children: ReactNode;
}

/**
 * Initialises one DictionaryService instance for the given locale and shares
 * it with all client-component children via context.
 *
 * The service instance is held in a ref and is never recreated on re-renders
 * or locale switches — only one instance exists per mounted provider.
 *
 * When the locale prop changes the instance calls setLocale() internally.
 * Once loading completes a new context handle object is published, which
 * triggers a re-render in every consumer of useDictionary(). Old translations
 * remain visible during the switch — there is no null/flash period.
 *
 * Usage (per-page — provider remounts on navigation):
 *   <DictionaryProvider config={dictionaryConfig} locale={locale}>
 *     <ClientNav />
 *   </DictionaryProvider>
 *
 * Usage (in layout — provider persists, locale prop updates in-place):
 *   // layout.tsx
 *   <DictionaryProvider config={dictionaryConfig} locale={activeLocale}>
 *     {children}
 *   </DictionaryProvider>
 */
export function DictionaryProvider({ config, locale, children }: DictionaryProviderProps) {
  const dictRef = useRef<DictionaryService | null>(null);
  // A new wrapper object is created after every locale switch so React context
  // detects a reference change and re-renders all consumers.
  const [handle, setHandle] = useState<DictionaryHandle | null>(null);

  useEffect(() => {
    // Create the service once. Config is excluded from deps — it must be a
    // stable module-level reference. To change config, remount with a new key.
    if (!dictRef.current) {
      dictRef.current = new DictionaryService(config);
    }

    dictRef.current.setLocale(locale).then(() => {
      // Always produce a new wrapper object so the context value reference
      // changes and every useDictionary() consumer re-renders — whether this
      // provider is mounted per-page or persisted in a shared layout.
      setHandle({ instance: dictRef.current! });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  return (
    <DictionaryContext.Provider value={handle}>
      {children}
    </DictionaryContext.Provider>
  );
}

/**
 * Returns the shared DictionaryService instance for the current locale.
 * Must be used inside a <DictionaryProvider>.
 *
 * Returns null until the first locale file has loaded. After the initial load
 * it never returns null again — locale switches keep the old value visible
 * until the new locale is ready.
 *
 * Usage:
 *   import { useDictionary } from '@optimizely/cms-sdk/react/client';
 *
 *   const dict = useDictionary();
 *   return <button>{dict?.t('actions.submit') ?? '...'}</button>;
 */
export function useDictionary(): DictionaryService | null {
  return useContext(DictionaryContext)?.instance ?? null;
}
