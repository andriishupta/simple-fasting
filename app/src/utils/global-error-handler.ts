import { DiagnosticEventKind } from '@/storage/app-storage';
import { recordDiagnosticError } from '@/storage/diagnostic-storage';

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;

type GlobalErrorUtils = {
  getGlobalHandler: () => ErrorHandler;
  setGlobalHandler: (handler: ErrorHandler) => void;
};

type GlobalWithErrorUtils = typeof globalThis & {
  ErrorUtils?: GlobalErrorUtils;
};

let configured = false;

export const configureGlobalErrorHandler = (): void => {
  if (configured) return;

  const errorUtils = (globalThis as GlobalWithErrorUtils).ErrorUtils;

  if (errorUtils === undefined) return;

  configured = true;
  const previousHandler = errorUtils.getGlobalHandler();

  errorUtils.setGlobalHandler((error, isFatal) => {
    recordDiagnosticError({
      kind: isFatal === true ? DiagnosticEventKind.FatalJs : DiagnosticEventKind.Render,
      error,
      context: isFatal === true ? 'React Native global fatal JS handler' : 'React Native global JS handler',
    });

    previousHandler(error, isFatal);
  });
};

configureGlobalErrorHandler();
