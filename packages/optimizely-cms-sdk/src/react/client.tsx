'use client';
import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  type ReactNode,
  type ReactElement,
  type FunctionComponent,
  type PropsWithChildren,
} from 'react';

// ---------------------------------------------------------------------------
// App Settings Context
// ---------------------------------------------------------------------------

const AppSettingsContext = createContext<Record<string, unknown> | null>(null);

export interface AppSettingsProviderProps {
  /** Serializable settings object returned by getAppSettings(). */
  settings: Record<string, unknown> | null;
  children: ReactNode;
}

/**
 * Provides application-level CMS settings to all client components in the tree.
 * Place in the root layout so every page and component can access settings.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { AppSettingsProvider } from '@optimizely/cms-sdk/react/client';
 * import { getAppSettings } from '@/getAppSettings';
 *
 * export default async function RootLayout({ children }) {
 *   const settings = await getAppSettings().catch(() => null);
 *   return (
 *     <html><body>
 *       <AppSettingsProvider settings={settings}>{children}</AppSettingsProvider>
 *     </body></html>
 *   );
 * }
 * ```
 */
export function AppSettingsProvider({ settings, children }: AppSettingsProviderProps): ReactElement {
  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  );
}

/**
 * Returns application-level CMS settings in any client component.
 * Returns null if AppSettingsProvider is not in the tree or settings failed to load.
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useAppSettings } from '@optimizely/cms-sdk/react/client';
 *
 * export function Header() {
 *   const settings = useAppSettings<{ siteName: string; logoUrl: string }>();
 *   return <header><img src={settings?.logoUrl} alt={settings?.siteName} /></header>;
 * }
 * ```
 */
export function useAppSettings<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): T | null {
  return useContext(AppSettingsContext) as T | null;
}

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
