import { ZodError } from 'zod/v4';
import { errorMessage, redact } from './redaction.js';

export type PublicErrorDomain = 'common' | 'runtime' | 'accounts' | 'categories' | 'payees' | 'rules' |
  'transactions' | 'import' | 'budget' | 'transfers' | 'schedules' | 'summaries';
export type RetryabilityClass = 'never' | 'after-correction' | 'transient' | 'inspect-state-first';

interface PublicErrorDefinition {
  domain: PublicErrorDomain;
  retryability: RetryabilityClass;
  description: string;
  recoveryFields: readonly ('state' | 'partialState' | 'details' | 'recoveryAction')[];
}

const defineError = (
  domain: PublicErrorDomain,
  retryability: RetryabilityClass,
  description: string,
  recoveryFields: PublicErrorDefinition['recoveryFields'] = []
): PublicErrorDefinition => ({ domain, retryability, description, recoveryFields });

/** Exhaustive stable public error-code catalog for the v1 contract. */
export const PUBLIC_ERROR_CATALOG = {
  CONFIGURATION_ERROR: defineError('common', 'after-correction', 'Configuration or validated input is invalid.'),
  CONNECTION_ERROR: defineError('runtime', 'transient', 'Actual Server is unavailable.'),
  BUDGET_LOAD_ERROR: defineError('runtime', 'after-correction', 'The configured budget could not be loaded or decrypted.'),
  CACHE_IN_USE: defineError('runtime', 'transient', 'Another process owns the configured local cache.'),
  NOT_FOUND: defineError('common', 'after-correction', 'A requested entity does not exist.'),
  NOT_A_TRANSFER: defineError('transfers', 'after-correction', 'The requested transaction is not a transfer.'),
  NAME_CONFLICT: defineError('common', 'after-correction', 'A requested entity name conflicts with existing state.'),
  DESTRUCTIVE_CONFIRMATION_REQUIRED: defineError('common', 'after-correction', 'Literal per-call destructive consent is missing.'),
  READ_ONLY_MODE: defineError('runtime', 'after-correction', 'Process read-only policy blocks mutation.'),
  DESTRUCTIVE_OPERATIONS_DISABLED: defineError('runtime', 'after-correction', 'Process policy blocks destructive operations.'),
  SCHEDULE_NOT_FOUND: defineError('schedules', 'after-correction', 'The requested schedule does not exist.'),
  INVALID_RECURRENCE: defineError('schedules', 'after-correction', 'Schedule recurrence is invalid or unsupported.'),
  SCHEDULE_REFERENCE_INVALID: defineError('schedules', 'after-correction', 'A schedule references an invalid entity.'),
  INVALID_SUMMARY_RANGE: defineError('summaries', 'after-correction', 'Summary dates or scope are invalid.'),
  ACCOUNT_NOT_EMPTY: defineError('accounts', 'after-correction', 'Account deletion preflight found transactions.'),
  CATEGORY_GROUP_NOT_EMPTY: defineError('categories', 'after-correction', 'Category-group deletion preflight found categories.'),
  CATEGORY_IN_USE: defineError('categories', 'after-correction', 'Category deletion preflight found dependent state.'),
  PAYEE_IN_USE: defineError('payees', 'after-correction', 'Payee deletion preflight found dependent state.'),
  TRANSFER_PAYEE_PROTECTED: defineError('payees', 'never', 'Actual transfer payees cannot be administered as ordinary payees.'),
  INVALID_REFERENCE: defineError('common', 'after-correction', 'An entity reference is missing or incompatible.'),
  UNSUPPORTED_RULE_SHAPE: defineError('rules', 'after-correction', 'The installed rule shape cannot be safely written.'),
  PROTECTED_ACTUAL_ENTITY: defineError('common', 'after-correction', 'Actual protects this entity or operation.'),
  MERGE_PARTIAL_STATE: defineError('payees', 'inspect-state-first', 'A multi-source payee merge stopped after partial progress.', ['state', 'partialState', 'details', 'recoveryAction']),
  UNSAFE_CLOSE_WOULD_DELETE_ACCOUNT: defineError('accounts', 'after-correction', 'Closing the account would trigger installed destructive behavior.'),
  TRANSFER_ACCOUNT_REQUIRED: defineError('accounts', 'after-correction', 'Account closure requires a valid transfer destination.'),
  INCOMPATIBLE_CATEGORY_GROUP_TYPE: defineError('categories', 'after-correction', 'Category and target group have incompatible income types.'),
  PREFLIGHT_INCONCLUSIVE: defineError('common', 'transient', 'Required safety evidence could not be proven.'),
  BUDGET_MONTH_UNAVAILABLE: defineError('budget', 'after-correction', 'The requested budget month is unavailable.'),
  UNSUPPORTED_BUDGET_MODE: defineError('budget', 'never', 'The installed budget mode does not support the operation.'),
  INCOMPATIBLE_BUDGET_CATEGORY: defineError('budget', 'after-correction', 'The category shape cannot support the requested budget mutation.'),
  INVALID_BUDGET_VALUE: defineError('budget', 'after-correction', 'A budget value, month, mode, or bound is invalid.'),
  OVERWRITE_CONFIRMATION_REQUIRED: defineError('budget', 'after-correction', 'A nonzero budget overwrite requires reviewed per-call consent.'),
  BUDGET_VERIFICATION_FAILED: defineError('budget', 'inspect-state-first', 'Budget read-back did not verify the requested state.', ['state', 'partialState', 'details', 'recoveryAction']),
  BUDGET_COPY_PARTIAL_STATE: defineError('budget', 'inspect-state-first', 'Sequential budget copy stopped after partial progress.', ['state', 'partialState', 'details', 'recoveryAction']),
  MUTATION_FAILED: defineError('common', 'inspect-state-first', 'A mutation failed without proof that state is unchanged.', ['details', 'recoveryAction']),
  RESULT_TOO_LARGE: defineError('common', 'after-correction', 'A bounded operation would exceed its safe result or change limit.'),
  RESULT_LIMIT_EXCEEDED: defineError('common', 'after-correction', 'A bounded scan detected more records than supported.'),
  INCOMPATIBLE_FILTERS: defineError('transactions', 'after-correction', 'Typed filters or amounts are mutually incompatible.'),
  QUERY_SHAPE_INVALID: defineError('transactions', 'transient', 'Actual returned an unsupported fixed-query result shape.'),
  IMPORT_PREVIEW_SHAPE_INVALID: defineError('import', 'transient', 'Actual returned an unsupported import-preview shape.'),
  PREVIEW_FINGERPRINT_MISMATCH: defineError('import', 'after-correction', 'Execution input does not match the reviewed preview.'),
  WRITE_CONFIRMATION_REQUIRED: defineError('common', 'after-correction', 'Explicit execution consent is missing for a previewable write.'),
  SPLIT_TRANSACTION_PROTECTED: defineError('transactions', 'after-correction', 'The requested direct mutation would violate split integrity.'),
  TRANSFER_PROTECTED: defineError('transactions', 'after-correction', 'The requested direct mutation would violate transfer integrity.'),
  TRANSFER_INTEGRITY_FAILED: defineError('transfers', 'inspect-state-first', 'Transfer relationship verification failed.', ['state', 'partialState', 'details', 'recoveryAction']),
  TRANSFER_CREATION_PARTIAL_STATE: defineError('transfers', 'inspect-state-first', 'Transfer creation stopped after partial progress.', ['state', 'partialState', 'details', 'recoveryAction']),
  BULK_PREFLIGHT_FAILED: defineError('transactions', 'after-correction', 'Bulk desired-state preflight rejected the complete batch.', ['details']),
  BULK_PARTIAL_STATE: defineError('transactions', 'inspect-state-first', 'Bulk execution stopped after partial progress.', ['state', 'partialState', 'details', 'recoveryAction']),
  BULK_VERIFICATION_FAILED: defineError('transactions', 'inspect-state-first', 'Bulk read-back did not verify requested state.', ['state', 'partialState', 'details', 'recoveryAction']),
  MUTATION_SYNC_FAILED: defineError('runtime', 'inspect-state-first', 'A local mutation may have succeeded before synchronization failed.', ['state', 'partialState', 'details', 'recoveryAction']),
  POST_MUTATION_READ_FAILED: defineError('runtime', 'inspect-state-first', 'Synchronization completed but final read-back failed.', ['state', 'partialState', 'details', 'recoveryAction']),
  ACTUAL_OPERATION_FAILED: defineError('common', 'transient', 'The supported Actual operation failed safely.'),
  INTERNAL_ERROR: defineError('common', 'inspect-state-first', 'An unexpected error was sanitized at the MCP boundary.')
} as const;

export type PublicErrorCode = keyof typeof PUBLIC_ERROR_CATALOG;

export interface PublicErrorMetadata {
  details?: Record<string, unknown>;
  recoveryAction?: string;
  entity?: { type: 'account' | 'categoryGroup' | 'category' | 'transaction' | 'payee' | 'rule' | 'schedule' | 'budgetMonth'; id?: string; name?: string };
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
