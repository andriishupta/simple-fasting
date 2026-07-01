import { DiagnosticEventKind } from '@/storage/app-storage';
import { recordDiagnosticError } from '@/storage/diagnostic-storage';

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;

type GlobalErrorUtils = {
  getGlobalHandler: () => ErrorHandler;
  setGlobalHandler: (handler: ErrorHandler) => void;
};

type GlobalWithErrorUtils = typeof globalThis & {
  ErrorUtils?: GlobalErrorUtils;
  addEventListener?: (
    type: 'unhandledrejection',
    listener: (event: { reason?: unknown }) => void,
  ) => void;
};

let configured = false;
let unhandledPromiseRejectionConfigured = false;

const recordGlobalError = ({
  error,
  isFatal,
  context,
}: {
  error: unknown;
  isFatal: boolean;
  context: string;
}): void => {
  recordDiagnosticError({
    kind: isFatal ? DiagnosticEventKind.FatalJs : DiagnosticEventKind.UnhandledJs,
    error,
    context,
  });
};

const configureUnhandledPromiseRejectionHandler = (): void => {
  if (unhandledPromiseRejectionConfigured) return;

  const globalWithEvents = globalThis as GlobalWithErrorUtils;
  const addEventListener = globalWithEvents.addEventListener;

  if (addEventListener === undefined) return;

  unhandledPromiseRejectionConfigured = true;
  addEventListener('unhandledrejection', (event) => {
    recordGlobalError({
      error: event.reason ?? 'Unhandled promise rejection',
      isFatal: false,
      context: 'Global unhandled promise rejection handler',
    });
  });
};

export const configureGlobalErrorHandler = (): void => {
  configureUnhandledPromiseRejectionHandler();

  if (configured) return;

  const errorUtils = (globalThis as GlobalWithErrorUtils).ErrorUtils;

  if (errorUtils === undefined) return;

  configured = true;
  const previousHandler = errorUtils.getGlobalHandler();

  errorUtils.setGlobalHandler((error, isFatal) => {
    recordGlobalError({
      error,
      isFatal: isFatal === true,
      context: isFatal === true ? 'React Native global fatal JS handler' : 'React Native global JS handler',
    });

    previousHandler(error, isFatal);
  });
};

configureGlobalErrorHandler();
