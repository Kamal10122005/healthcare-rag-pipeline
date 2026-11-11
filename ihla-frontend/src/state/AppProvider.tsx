import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { appConfig, isConnectedModeConfigured } from '@/config/env';
import { createService } from '@/services';
import type { HealthAssistantService } from '@/services/contracts';
import { ServiceError, toServiceError } from '@/services/errors';
import { STORAGE_KEYS, usePersistentState, writeStored } from '@/lib/storage';
import type {
  BackendHealth,
  ReadingLevel,
  ServiceErrorInfo,
  ServiceMode,
} from '@/types/models';

export type ThemePreference = 'light' | 'dark';
export type ConnectionStatus = 'idle' | 'checking' | 'online' | 'offline';

interface ConnectionState {
  status: ConnectionStatus;
  health: BackendHealth | null;
  error: ServiceErrorInfo | null;
  lastCheckedAt: string | null;
}

interface AppContextValue {
  /** The active service. Changes identity when the mode changes. */
  service: HealthAssistantService;
  mode: ServiceMode;
  setMode: (mode: ServiceMode) => void;
  modeSwitchAllowed: boolean;
  connectedModeConfigured: boolean;

  connection: ConnectionState;
  checkConnection: () => Promise<void>;

  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;

  readingLevel: ReadingLevel;
  setReadingLevel: (level: ReadingLevel) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const isMode = (value: unknown): value is ServiceMode =>
  value === 'demo' || value === 'connected';
const isTheme = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark';
const isReadingLevel = (value: unknown): value is ReadingLevel =>
  value === 'plain' || value === 'standard' || value === 'clinical';

function initialTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.theme);
    if (stored) {
      const parsed = JSON.parse(stored) as unknown;
      if (isTheme(parsed)) return parsed;
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const connectedModeConfigured = isConnectedModeConfigured();

  const [mode, setModeState] = usePersistentState<ServiceMode>(
    STORAGE_KEYS.mode,
    appConfig.defaultMode,
    isMode,
  );
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme);
  const [readingLevel, setReadingLevelState] = usePersistentState<ReadingLevel>(
    STORAGE_KEYS.readingLevel,
    'standard',
    isReadingLevel,
  );

  const [connection, setConnection] = useState<ConnectionState>({
    status: 'idle',
    health: null,
    error: null,
    lastCheckedAt: null,
  });

  const service = useMemo(() => createService(mode), [mode]);
  const serviceRef = useRef(service);
  serviceRef.current = service;

  const setMode = useCallback(
    (next: ServiceMode) => {
      if (!appConfig.allowModeSwitch) return;
      setModeState(next);
      setConnection({ status: 'idle', health: null, error: null, lastCheckedAt: null });
    },
    [setModeState],
  );

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    writeStored(STORAGE_KEYS.theme, next);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const checkConnection = useCallback(async () => {
    const active = serviceRef.current;

    if (active.mode === 'connected' && !connectedModeConfigured) {
      setConnection({
        status: 'offline',
        health: null,
        error: new ServiceError('not_configured', {
          endpoint: '/health',
        }).toInfo(),
        lastCheckedAt: new Date().toISOString(),
      });
      return;
    }

    setConnection((current) => ({ ...current, status: 'checking' }));

    try {
      const health = await active.checkHealth();
      // A mode switch mid-flight must not apply a stale result.
      if (serviceRef.current !== active) return;
      setConnection({
        status: 'online',
        health,
        error: null,
        lastCheckedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (serviceRef.current !== active) return;
      const serviceError = toServiceError(error, '/health');
      if (serviceError.isAborted) return;
      setConnection({
        status: 'offline',
        health: null,
        error: serviceError.toInfo(),
        lastCheckedAt: new Date().toISOString(),
      });
    }
  }, [connectedModeConfigured]);

  // Probe on boot and whenever the mode changes.
  useEffect(() => {
    void checkConnection();
  }, [checkConnection, mode]);

  // Re-probe periodically in Connected Mode so the shell indicator stays honest.
  useEffect(() => {
    if (mode !== 'connected' || !connectedModeConfigured) return;
    const interval = window.setInterval(() => void checkConnection(), 60_000);
    return () => window.clearInterval(interval);
  }, [mode, connectedModeConfigured, checkConnection]);

  const value = useMemo<AppContextValue>(
    () => ({
      service,
      mode,
      setMode,
      modeSwitchAllowed: appConfig.allowModeSwitch,
      connectedModeConfigured,
      connection,
      checkConnection,
      theme,
      setTheme,
      readingLevel,
      setReadingLevel: setReadingLevelState,
    }),
    [
      service,
      mode,
      setMode,
      connectedModeConfigured,
      connection,
      checkConnection,
      theme,
      setTheme,
      readingLevel,
      setReadingLevelState,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside <AppProvider>.');
  return context;
}

/** Convenience accessor for the active service. */
export function useService(): HealthAssistantService {
  return useApp().service;
}
