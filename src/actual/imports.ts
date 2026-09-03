import { createHash } from 'node:crypto';
import { PublicError } from '../errors.js';
import type {
  AdapterImportOptions,
  AdapterImportPreviewEntry,
  AdapterImportResult,
  ImportTransaction
} from './adapter.js';

export interface ImportRequestOptions {
  defaultCleared?: boolean;
  reimportDeleted?: boolean;
}

export interface NormalizedImportRequest {
  accountId: string;
  transactions: ImportTransaction[];
  options: Omit<AdapterImportOptions, 'dryRun'>;
}

export function normalizeImportRequest(
  accountId: string,
  transactions: Omit<ImportTransaction, 'account'>[],
  options: ImportRequestOptions = {}
): NormalizedImportRequest {
  return {
    accountId,
    options: {
      defaultCleared: options.defaultCleared ?? true,
      reimportDeleted: options.reimportDeleted ?? false
    },
    transactions: transactions.map(transaction => ({ ...transaction, account: accountId }))
  };
}

export function importRequestFingerprint(request: NormalizedImportRequest): string {
  const canonical = JSON.stringify({
    version: 1,
    accountId: request.accountId,
    options: {
      defaultCleared: request.options.defaultCleared,
      reimportDeleted: request.options.reimportDeleted
    },
    transactions: request.transactions.map(transaction => ({
      account: transaction.account,
      date: transaction.date,
      amount: transaction.amount,
      imported_id: transaction.imported_id,
      ...(transaction.payee === undefined ? {} : { payee: transaction.payee }),
      ...(transaction.payee_name === undefined ? {} : { payee_name: transaction.payee_name }),
      ...(transaction.imported_payee === undefined ? {} : { imported_payee: transaction.imported_payee }),
      ...(transaction.notes === undefined ? {} : { notes: transaction.notes }),
      ...(transaction.cleared === undefined ? {} : { cleared: transaction.cleared }),
      ...(transaction.category === undefined ? {} : { category: transaction.category })
    }))
  });
  return `v1:${createHash('sha256').update(canonical).digest('hex')}`;
}

function record(value: unknown, operation: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new PublicError('IMPORT_PREVIEW_SHAPE_INVALID', 'Actual returned an unsupported import result shape.', operation, false);
  }
  return value as Record<string, unknown>;
}

export function parseImportResult(value: unknown, operation: string): AdapterImportResult {
  const result = record(value, operation);
  if (!Array.isArray(result.added) || result.added.some(item => typeof item !== 'string') ||
      !Array.isArray(result.updated) || result.updated.some(item => typeof item !== 'string') ||
      !Array.isArray(result.errors) || !Array.isArray(result.updatedPreview ?? [])) {
    throw new PublicError('IMPORT_PREVIEW_SHAPE_INVALID', 'Actual returned an unsupported import result shape.', operation, false);
  }
  const errors = result.errors.map(item => {
    const error = record(item, operation);
    if (typeof error.message !== 'string') {
      throw new PublicError('IMPORT_PREVIEW_SHAPE_INVALID', 'Actual returned an unsupported import error shape.', operation, false);
    }
    return { message: error.message };
  });
  const updatedPreview = (result.updatedPreview as unknown[]).map(item => {
    const preview = record(item, operation);
    const transaction = record(preview.transaction, operation);
    if (preview.existing !== undefined && preview.existing !== false) record(preview.existing, operation);
    if (preview.ignored !== undefined && typeof preview.ignored !== 'boolean') throw new PublicError(
      'IMPORT_PREVIEW_SHAPE_INVALID', 'Actual returned unsupported ignored preview evidence.', operation, false
    );
    return preview as unknown as AdapterImportPreviewEntry;
  });
  return { added: result.added as string[], updated: result.updated as string[], errors, updatedPreview };
}
