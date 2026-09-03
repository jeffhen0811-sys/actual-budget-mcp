import { q } from '@actual-app/api';
import { PublicError } from '../errors.js';
import type { AdapterTransaction, AdapterTransactionQuery } from './adapter.js';

export type TransactionSplitMode = 'inline' | 'grouped';
export type TransactionSort =
  | 'date_desc' | 'date_asc'
  | 'amount_desc' | 'amount_asc'
  | 'payee_asc' | 'payee_desc'
  | 'category_asc' | 'category_desc';

export interface TransactionSearchRequest {
  startDate: string;
  endDate: string;
  accountIds?: string[] | undefined;
  transactionIds?: string[] | undefined;
  payeeIds?: string[] | undefined;
  categoryIds?: string[] | undefined;
  uncategorizedOnly?: boolean | undefined;
  importSource?: 'any' | 'manual' | 'imported' | undefined;
  cleared?: boolean | undefined;
  minAmount?: number | undefined;
  maxAmount?: number | undefined;
  text?: string | undefined;
  splitMode?: TransactionSplitMode | undefined;
  sort?: TransactionSort | undefined;
  limit: number;
  offset: number;
  includeTotals?: boolean | undefined;
}

const transactionSelect = [
  'id', 'account', 'date', 'amount', 'payee', { payee_name: 'payee.name' },
  'imported_payee', 'category', { category_name: 'category.name' }, 'notes',
  'imported_id', 'transfer_id', 'cleared', 'reconciled', 'starting_balance_flag',
  'is_parent', 'is_child', 'parent_id'
] as const;

type Filter = Record<string, unknown>;

export function escapeActualLikeLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/\?/g, '\\?');
}

export function buildTransactionFilters(input: TransactionSearchRequest): Filter[] {
  const filters: Filter[] = [{ date: { $gte: input.startDate, $lte: input.endDate } }];
  if (input.accountIds?.length) filters.push({ account: { $oneof: input.accountIds } });
  if (input.transactionIds?.length) filters.push({ id: { $oneof: input.transactionIds } });
  if (input.payeeIds?.length) filters.push({ payee: { $oneof: input.payeeIds } });
  if (input.categoryIds?.length) filters.push({ category: { $oneof: input.categoryIds } });
  if (input.uncategorizedOnly) filters.push({ category: null }, { transfer_id: null }, { is_parent: false });
  if (input.importSource === 'manual') filters.push({ $or: [{ imported_id: null }, { imported_id: '' }] });
  if (input.importSource === 'imported') filters.push({ imported_id: { $ne: null } }, { imported_id: { $ne: '' } });
  if (input.cleared !== undefined) filters.push({ cleared: input.cleared });
  if (input.minAmount !== undefined || input.maxAmount !== undefined) {
    filters.push({ amount: {
      ...(input.minAmount === undefined ? {} : { $gte: input.minAmount }),
      ...(input.maxAmount === undefined ? {} : { $lte: input.maxAmount })
    } });
  }
  if (input.text !== undefined) {
    const like = `%${escapeActualLikeLiteral(input.text)}%`;
    filters.push({ $or: [
      { 'payee.name': { $like: like } },
      { imported_payee: { $like: like } },
      { notes: { $like: like } }
    ] });
  }
  return filters;
}

function sortExpression(sort: TransactionSort | undefined): Array<Record<string, 'asc' | 'desc'>> {
  const [field, direction] = (sort ?? 'date_desc').split('_') as [string, 'asc' | 'desc'];
  const actualField = field === 'payee' ? 'payee.name' : field === 'category' ? 'category.name' : field;
  return [{ [actualField]: direction }, { id: 'asc' }];
}

function filteredTransactionQuery(input: TransactionSearchRequest, splitMode: TransactionSplitMode | 'all'): AdapterTransactionQuery {
  const filters = buildTransactionFilters(input);
  return q('transactions')
    .filter(filters.length === 1 ? filters[0]! : { $and: filters })
    .options({ splits: splitMode });
}

export function compileTransactionSearch(input: TransactionSearchRequest): AdapterTransactionQuery {
  return filteredTransactionQuery(input, input.splitMode ?? 'inline')
    .select([...transactionSelect])
    .orderBy(sortExpression(input.sort))
    .limit(input.limit)
    .offset(input.offset);
}

export function compileTransactionTotal(input: TransactionSearchRequest, calculation: 'count' | 'sum'): AdapterTransactionQuery {
  return filteredTransactionQuery(input, 'inline').calculate(calculation === 'count' ? { $count: 'id' } : { $sum: '$amount' });
}

export function compileExactTransaction(transactionId: string, splitMode: 'all' | 'grouped'): AdapterTransactionQuery {
  return q('transactions')
    .filter({ id: transactionId })
    .select([...transactionSelect])
    .options({ splits: splitMode });
}

export function compileTransactionsByIds(transactionIds: string[]): AdapterTransactionQuery {
  return q('transactions')
    .filter({ id: { $oneof: transactionIds } })
    .select([...transactionSelect])
    .options({ splits: 'all' });
}

function objectValue(value: unknown, operation: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new PublicError('QUERY_SHAPE_INVALID', 'Actual returned an unsupported transaction query shape.', operation, false);
  }
  return value as Record<string, unknown>;
}

export function parseAqlRows(value: unknown, operation: string): AdapterTransaction[] {
  const envelope = objectValue(value, operation);
  if (!Array.isArray(envelope.data)) {
    throw new PublicError('QUERY_SHAPE_INVALID', 'Actual returned an unsupported transaction query shape.', operation, false);
  }
  return envelope.data.map(row => objectValue(row, operation) as unknown as AdapterTransaction);
}

export function parseAqlAggregate(value: unknown, operation: string): number {
  const envelope = objectValue(value, operation);
  const candidate = typeof envelope.data === 'number'
    ? envelope.data
    : Array.isArray(envelope.data) && envelope.data.length === 1
      ? objectValue(envelope.data[0], operation).result
      : undefined;
  if (typeof candidate !== 'number' || !Number.isSafeInteger(candidate)) {
    throw new PublicError('QUERY_SHAPE_INVALID', 'Actual returned an unsupported aggregate query shape.', operation, false);
  }
  return candidate;
}

function optional<T extends keyof AdapterTransaction>(transaction: AdapterTransaction, key: T): Pick<AdapterTransaction, T> | object {
  return transaction[key] === undefined ? {} : { [key]: transaction[key] } as Pick<AdapterTransaction, T>;
}

export function projectTransaction(transaction: AdapterTransaction, operation = 'actual_transaction_projection'): AdapterTransaction {
  if (typeof transaction.id !== 'string' || typeof transaction.account !== 'string' ||
      typeof transaction.date !== 'string' || !Number.isSafeInteger(transaction.amount)) {
    throw new PublicError('QUERY_SHAPE_INVALID', 'Actual returned an incomplete canonical transaction.', operation, false);
  }
  return {
    id: transaction.id,
    account: transaction.account,
    date: transaction.date,
    amount: transaction.amount,
    ...optional(transaction, 'payee'),
    ...optional(transaction, 'payee_name'),
    ...optional(transaction, 'category'),
    ...optional(transaction, 'category_name'),
    ...optional(transaction, 'notes'),
    ...optional(transaction, 'cleared'),
    ...optional(transaction, 'reconciled'),
    ...optional(transaction, 'imported_id'),
    ...optional(transaction, 'imported_payee'),
    ...optional(transaction, 'transfer_id'),
    ...optional(transaction, 'starting_balance_flag'),
    ...optional(transaction, 'is_parent'),
    ...optional(transaction, 'is_child'),
    ...optional(transaction, 'parent_id'),
    ...(transaction.subtransactions === undefined ? {} : {
      subtransactions: transaction.subtransactions.map(item => projectTransaction(item, operation))
    })
  };
}
