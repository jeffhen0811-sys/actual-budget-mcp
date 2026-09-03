import { ZodError } from 'zod/v4';
import { errorMessage, redact } from './redaction.js';

export type PublicErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'CONNECTION_ERROR'
  | 'BUDGET_LOAD_ERROR'
  | 'CACHE_IN_USE'
  | 'NOT_FOUND'
  | 'NOT_A_TRANSFER'
  | 'NAME_CONFLICT'
  | 'DESTRUCTIVE_CONFIRMATION_REQUIRED'
  | 'ACCOUNT_NOT_EMPTY'
  | 'CATEGORY_GROUP_NOT_EMPTY'
  | 'CATEGORY_IN_USE'
  | 'PAYEE_IN_USE'
  | 'TRANSFER_PAYEE_PROTECTED'
  | 'INVALID_REFERENCE'
  | 'UNSUPPORTED_RULE_SHAPE'
  | 'PROTECTED_ACTUAL_ENTITY'
  | 'MERGE_PARTIAL_STATE'
  | 'UNSAFE_CLOSE_WOULD_DELETE_ACCOUNT'
  | 'TRANSFER_ACCOUNT_REQUIRED'
  | 'INCOMPATIBLE_CATEGORY_GROUP_TYPE'
  | 'PREFLIGHT_INCONCLUSIVE'
  | 'BUDGET_MONTH_UNAVAILABLE'
  | 'UNSUPPORTED_BUDGET_MODE'
  | 'INCOMPATIBLE_BUDGET_CATEGORY'
  | 'INVALID_BUDGET_VALUE'
  | 'OVERWRITE_CONFIRMATION_REQUIRED'
  | 'BUDGET_VERIFICATION_FAILED'
  | 'BUDGET_COPY_PARTIAL_STATE'
  | 'MUTATION_FAILED'
  | 'RESULT_TOO_LARGE'
  | 'RESULT_LIMIT_EXCEEDED'
  | 'INCOMPATIBLE_FILTERS'
  | 'QUERY_SHAPE_INVALID'
  | 'IMPORT_PREVIEW_SHAPE_INVALID'
  | 'PREVIEW_FINGERPRINT_MISMATCH'
  | 'WRITE_CONFIRMATION_REQUIRED'
  | 'SPLIT_TRANSACTION_PROTECTED'
  | 'TRANSFER_PROTECTED'
  | 'TRANSFER_INTEGRITY_FAILED'
  | 'TRANSFER_CREATION_PARTIAL_STATE'
  | 'BULK_PREFLIGHT_FAILED'
  | 'BULK_PARTIAL_STATE'
  | 'BULK_VERIFICATION_FAILED'
  | 'MUTATION_SYNC_FAILED'
  | 'POST_MUTATION_READ_FAILED'
  | 'ACTUAL_OPERATION_FAILED'
  | 'INTERNAL_ERROR';

export interface PublicErrorMetadata {
  details?: Record<string, unknown>;
  recoveryAction?: string;
  entity?: { type: 'account' | 'categoryGroup' | 'category' | 'transaction' | 'payee' | 'rule' | 'budgetMonth'; id?: string; name?: string };
  state?: 'local_change_may_have_succeeded' | 'synchronized_but_unverified';
  partialState?: boolean;
}

export class PublicError extends Error {
  constructor(
    public readonly code: PublicErrorCode,
    message: string,
    public readonly operation: string,
    public readonly retryable: boolean,
    public readonly metadata?: PublicErrorMetadata,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'PublicError';
  }
}

export interface ErrorPayload {
  error: { code: PublicErrorCode; message: string; operation: string; retryable: boolean } & PublicErrorMetadata;
}

export function mapError(error: unknown, operation: string, secrets: readonly (string | undefined)[] = []): PublicError {
  if (error instanceof PublicError) {
    return new PublicError(error.code, redact(error.message, secrets), error.operation, error.retryable, sanitizeMetadata(error.metadata, secrets), { cause: error });
  }
  if (error instanceof ZodError) {
    const message = error.issues.map(issue => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ');
    return new PublicError('CONFIGURATION_ERROR', redact(message, secrets), operation, false, undefined, { cause: error });
  }
  const raw = redact(errorMessage(error), secrets);
  const lower = raw.toLowerCase();
  if (lower.includes('econnrefused') || lower.includes('fetch failed') || lower.includes('network') || lower.includes('no-server')) {
    return new PublicError('CONNECTION_ERROR', 'The Actual Server is unavailable.', operation, true, undefined, { cause: error });
  }
  if (lower.includes('encryption') || lower.includes('missing-key') || lower.includes('decrypt')) {
    return new PublicError('BUDGET_LOAD_ERROR', 'The budget could not be decrypted. Configure ACTUAL_ENCRYPTION_PASSWORD if required.', operation, false, undefined, { cause: error });
  }
  return new PublicError('INTERNAL_ERROR', 'The Actual operation failed unexpectedly.', operation, false, undefined, { cause: error });
}

export function toErrorPayload(error: PublicError): ErrorPayload {
  return {
    error: {
      code: error.code,
      message: error.message,
      operation: error.operation,
      retryable: error.retryable,
      ...(error.metadata ?? {})
    }
  };
}

function sanitizeMetadata(metadata: PublicErrorMetadata | undefined, secrets: readonly (string | undefined)[]): PublicErrorMetadata | undefined {
  if (!metadata) return undefined;
  return JSON.parse(redact(JSON.stringify(metadata), secrets)) as PublicErrorMetadata;
}
