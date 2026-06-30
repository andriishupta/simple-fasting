import { DiagnosticEventKind, appStorage } from '@/storage/app-storage';
import { getDiagnostics } from '@/storage/diagnostic-storage';
import { initializeAppStorage } from '@/storage/storage-migrations';

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;
type GlobalWithErrorUtils = typeof globalThis & {
  ErrorUtils?: {
    getGlobalHandler: () => ErrorHandler;
    setGlobalHandler: (handler: ErrorHandler) => void;
  };
};

describe('global React Native error handler', () => {
  const originalErrorUtils = (globalThis as GlobalWithErrorUtils).ErrorUtils;

  afterEach(() => {
    appStorage.clear();
    jest.resetModules();
    jest.restoreAllMocks();
    Object.defineProperty(globalThis, 'ErrorUtils', {
      configurable: true,
      value: originalErrorUtils,
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
});
