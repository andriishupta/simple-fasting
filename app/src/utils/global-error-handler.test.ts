import { DiagnosticEventKind, appStorage } from '@/storage/app-storage';
import { getDiagnostics } from '@/storage/diagnostic-storage';
import { initializeAppStorage } from '@/storage/storage-migrations';

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;
type GlobalWithErrorUtils = typeof globalThis & {
  ErrorUtils?: {
    getGlobalHandler: () => ErrorHandler;
    setGlobalHandler: (handler: ErrorHandler) => void;
  };
  addEventListener?: (
    type: 'unhandledrejection',
    listener: (event: { reason?: unknown }) => void,
  ) => void;
};

describe('global React Native error handler', () => {
  const originalErrorUtils = (globalThis as GlobalWithErrorUtils).ErrorUtils;
  const originalAddEventListener = (globalThis as GlobalWithErrorUtils).addEventListener;

  afterEach(() => {
    appStorage.clear();
    jest.resetModules();
    jest.restoreAllMocks();
    Object.defineProperty(globalThis, 'ErrorUtils', {
      configurable: true,
      value: originalErrorUtils,
    });
    Object.defineProperty(globalThis, 'addEventListener', {
      configurable: true,
      value: originalAddEventListener,
    });
  });

  test('records fatal JS errors locally and preserves the React Native handler', async () => {
    initializeAppStorage();
    const previousHandler = jest.fn();
    let installedHandler: ErrorHandler | undefined;
    Object.defineProperty(globalThis, 'ErrorUtils', {
      configurable: true,
      value: {
        getGlobalHandler: () => previousHandler,
        setGlobalHandler: (handler: ErrorHandler) => {
          installedHandler = handler;
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/utils/global-error-handler') as unknown;
    expect(installedHandler).toBeDefined();
    if (installedHandler === undefined) {
      throw new Error('Global error handler was not installed.');
    }
    installedHandler(new Error('Boom'), true);

    expect(previousHandler).toHaveBeenCalledWith(expect.any(Error), true);
    expect(getDiagnostics().events).toEqual([
      expect.objectContaining({
        kind: DiagnosticEventKind.FatalJs,
        message: 'Boom',
      }),
    ]);
  });

  test('records unhandled promise rejections from the global boundary', () => {
    initializeAppStorage();
    let rejectionListener: ((event: { reason?: unknown }) => void) | undefined;
    Object.defineProperty(globalThis, 'addEventListener', {
      configurable: true,
      value: (
        type: 'unhandledrejection',
        listener: (event: { reason?: unknown }) => void,
      ) => {
        if (type === 'unhandledrejection') {
          rejectionListener = listener;
        }
      },
    });
    Object.defineProperty(globalThis, 'ErrorUtils', {
      configurable: true,
      value: undefined,
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/utils/global-error-handler') as unknown;
    expect(rejectionListener).toBeDefined();
    rejectionListener?.({ reason: new Error('Async failed') });

    expect(getDiagnostics().events).toEqual([
      expect.objectContaining({
        kind: DiagnosticEventKind.UnhandledJs,
        message: 'Async failed',
        context: 'Global unhandled promise rejection handler',
      }),
    ]);
  });
});
