import { notify } from "@/lib/notifications";

interface ErrorContext {
  operation: string;
  tenantId?: string;
  userId?: string;
  details?: Record<string, any>;
  error: unknown;
}

// Log errors properly with context
export function logError(message: string, context: ErrorContext) {
  // In development, log to console with full context
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${message}`, {
      operation: context.operation,
      tenantId: context.tenantId,
      userId: context.userId,
      details: context.details,
      error: context.error,
      timestamp: new Date().toISOString(),
    });
  }

  // In production, send to monitoring service
  // TODO: Integrate with error monitoring service (Sentry, LogRocket, etc.)
  if (process.env.NODE_ENV === 'production') {
    // Send to error monitoring service
    // Example: Sentry.captureException(error, { extra: context });
  }

  // Always log to browser console for debugging (but simplified in production)
  console.error(`${message} (${context.operation})`, context.error);
}

// Handle errors consistently across the application
export function handleError(
  message: string,
  context: ErrorContext,
  options: {
    showToast?: boolean;
    toastMessage?: string;
    rethrow?: boolean;
  } = {}
) {
  const {
    showToast = true,
    toastMessage = "Something went wrong. Please try again.",
    rethrow = false,
  } = options;

  // Log the error
  logError(message, context);

  // Show user-friendly toast notification
  if (showToast) {
    notify.error(toastMessage);
  }

  // Optionally rethrow for calling code to handle
  if (rethrow) {
    throw context.error;
  }
}

// Extract meaningful error message from unknown error
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unknown error occurred';
}

// Check if error is a specific type (e.g., network, auth, etc.)
export function isNetworkError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('network') ||
    error.message.includes('fetch') ||
    error.message.includes('connection')
  );
}

export function isAuthError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('auth') ||
    error.message.includes('unauthorized') ||
    error.message.includes('forbidden')
  );
}

export function isValidationError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('validation') ||
    error.message.includes('invalid') ||
    error.message.includes('required')
  );
}