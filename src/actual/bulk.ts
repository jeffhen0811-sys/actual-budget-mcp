import { PublicError } from '../errors.js';
import type { AdapterTransaction } from './adapter.js';
import { projectTransaction } from './transactions.js';
import { meaningfulId } from './transfers.js';

export interface BulkDesiredFields {
  category?: string | null;
  payee?: string | null;
  notes?: string | null;
  cleared?: boolean;
}

export interface BulkUpdateItem {
  transactionId: string;
  fields: BulkDesiredFields;
}

export type BulkPlanStatus = 'would_update' | 'unchanged' | 'blocked';

export interface BulkPlanItem {
  transactionId: string;
  status: BulkPlanStatus;
  changedFields: Array<keyof BulkDesiredFields>;
  before: AdapterTransaction;
  after: AdapterTransaction;
  reason?: 'SPLIT_TRANSACTION_PROTECTED' | 'TRANSFER_PROTECTED';
}

export interface BulkPlan {
  executable: boolean;
  requested: number;
  matched: number;
  wouldUpdate: number;
  unchanged: number;
  blocked: number;
  items: BulkPlanItem[];
}

function structuralFailure(message: string, details: Record<string, unknown>): never {
  throw new PublicError('BULK_PREFLIGHT_FAILED', message, 'actual_bulk_update_transactions', false, { details });
}

export function planBulkTransactionUpdates(
  requested: BulkUpdateItem[],
  transactions: AdapterTransaction[],
  categoryIds: ReadonlySet<string>,
  payeeIds: ReadonlySet<string>
): BulkPlan {
  const ids = requested.map(item => item.transactionId);
  if (new Set(ids).size !== ids.length) structuralFailure('Bulk transaction IDs must be unique.', { requestedIds: ids });
  const byId = new Map(transactions.map(transaction => [transaction.id, transaction]));
  const missingIds = ids.filter(id => !byId.has(id));
  if (missingIds.length) structuralFailure('Every requested transaction must exist before bulk execution.', { requestedIds: ids, missingIds });
  const invalidCategoryIds = [...new Set(requested.flatMap(item =>
    typeof item.fields.category === 'string' && !categoryIds.has(item.fields.category) ? [item.fields.category] : []
  ))];
  const invalidPayeeIds = [...new Set(requested.flatMap(item =>
    typeof item.fields.payee === 'string' && !payeeIds.has(item.fields.payee) ? [item.fields.payee] : []
  ))];
  if (invalidCategoryIds.length || invalidPayeeIds.length) structuralFailure('Every category and payee reference must exist before bulk execution.', {
    requestedIds: ids, invalidCategoryIds, invalidPayeeIds
  });
  const unsupportedClears = requested.filter(item => item.fields.category === null || item.fields.payee === null).map(item => item.transactionId);
  if (unsupportedClears.length) structuralFailure(
    'Bulk category and payee clearing is unavailable because the pinned SDK contract has not been proven safe by every required probe.',
    { requestedIds: ids, unsupportedClearIds: unsupportedClears }
  );

  const items = requested.map(item => {
    const current = projectTransaction(byId.get(item.transactionId)!, 'actual_bulk_update_transactions');
    const changedFields = (Object.keys(item.fields) as Array<keyof BulkDesiredFields>)
      .filter(field => current[field] !== item.fields[field]);
    const after = { ...current, ...item.fields };
    const split = current.is_parent === true || current.is_child === true || current.parent_id != null || current.subtransactions !== undefined;
    if (split) return {
      transactionId: item.transactionId, status: 'blocked' as const, changedFields, before: current, after,
      reason: 'SPLIT_TRANSACTION_PROTECTED' as const
    };
    const transferRelationalChange = meaningfulId(current.transfer_id) !== null && changedFields.some(field => field !== 'cleared');
    if (transferRelationalChange) return {
      transactionId: item.transactionId, status: 'blocked' as const, changedFields, before: current, after,
      reason: 'TRANSFER_PROTECTED' as const
    };
    return {
      transactionId: item.transactionId,
      status: changedFields.length ? 'would_update' as const : 'unchanged' as const,
      changedFields,
      before: current,
      after
    };
  });
  const wouldUpdate = items.filter(item => item.status === 'would_update').length;
  const unchanged = items.filter(item => item.status === 'unchanged').length;
  const blocked = items.filter(item => item.status === 'blocked').length;
  return {
    executable: blocked === 0,
    requested: requested.length,
    matched: requested.length,
    wouldUpdate,
    unchanged,
    blocked,
    items
  };
}

export function desiredStateMatches(transaction: AdapterTransaction, desired: BulkDesiredFields): boolean {
  return (Object.keys(desired) as Array<keyof BulkDesiredFields>).every(field => transaction[field] === desired[field]);
}
