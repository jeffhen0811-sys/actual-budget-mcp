import { ZodError } from 'zod/v4';
import { errorMessage, redact } from './redaction.js';

export type PublicErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'CONNECTION_ERROR'
  | 'BUDGET_LOAD_ERROR'
  | 'CACHE_IN_USE'
  | 'NOT_FOUND'
  | 'RESULT_TOO_LARGE'
  | 'MUTATION_SYNC_FAILED'
  | 'ACTUAL_OPERATION_FAILED'
  | 'INTERNAL_ERROR';

export class PublicError extends Error {
  constructor(
    public readonly code: PublicErrorCode,
    message: string,
    public readonly operation: string,
    public readonly retryable: boolean,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'PublicError';
  }
}

export interface ErrorPayload {
  error: { code: PublicErrorCode; message: string; operation: string; retryable: boolean };
}

export function mapError(error: unknown, operation: string, secrets: readonly (string | undefined)[] = []): PublicError {
  if (error instanceof PublicError) {
    return new PublicError(error.code, redact(error.message, secrets), error.operation, error.retryable, { cause: error });
  }
  if (error instanceof ZodError) {
    const message = error.issues.map(issue => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ');
    return new PublicError('CONFIGURATION_ERROR', redact(message, secrets), operation, false, { cause: error });
  }
  const raw = redact(errorMessage(error), secrets);
  const lower = raw.toLowerCase();
  if (lower.includes('econnrefused') || lower.includes('fetch failed') || lower.includes('network') || lower.includes('no-server')) {
    return new PublicError('CONNECTION_ERROR', 'The Actual Server is unavailable.', operation, true, { cause: error });
  }
  if (lower.includes('encryption') || lower.includes('missing-key') || lower.includes('decrypt')) {
    return new PublicError('BUDGET_LOAD_ERROR', 'The budget could not be decrypted. Configure ACTUAL_ENCRYPTION_PASSWORD if required.', operation, false, { cause: error });
  }
  return new PublicError('INTERNAL_ERROR', 'The Actual operation failed unexpectedly.', operation, false, { cause: error });
}

export function toErrorPayload(error: PublicError): ErrorPayload {
  return { error: { code: error.code, message: error.message, operation: error.operation, retryable: error.retryable } };
}
