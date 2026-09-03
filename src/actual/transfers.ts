import { createHash } from 'node:crypto';
import type { AdapterTransaction } from './adapter.js';
import { projectTransaction } from './transactions.js';

export type TransferIntegrityReason =
  | 'MISSING_COUNTERPART'
  | 'NON_RECIPROCAL_RELATIONSHIP'
  | 'SAME_ACCOUNT'
  | 'ZERO_AMOUNT'
  | 'SAME_SIGN'
  | 'MAGNITUDE_MISMATCH'
  | 'MALFORMED_RELATIONSHIP_ID';

export type TransferIntegrity = 'VALID' | 'INVALID';

export interface TransferPair {
  pairKey: string;
  transactionA: AdapterTransaction | null;
  transactionB: AdapterTransaction | null;
  integrity: TransferIntegrity;
  reasonCodes: TransferIntegrityReason[];
  fromTransaction: AdapterTransaction | null;
  toTransaction: AdapterTransaction | null;
  magnitude: number | null;
}

export function meaningfulId(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function hashIds(ids: readonly string[]): string {
  const input = [...ids].sort().map(id => `${Buffer.byteLength(id, 'utf8')}:${id}`).join('|');
  return `v1:${createHash('sha256').update(input).digest('hex')}`;
}

export function pairKey(firstId: string, secondId: string): string {
  return hashIds([firstId, secondId]);
}

export const candidateKey = pairKey;

function orderedObserved(
  first: AdapterTransaction,
  second: AdapterTransaction | null
): [AdapterTransaction | null, AdapterTransaction | null] {
  if (!second) return [first, null];
  return first.id.localeCompare(second.id) <= 0 ? [first, second] : [second, first];
}

export function assembleTransferPair(
  rawAnchor: AdapterTransaction,
  rawCounterpart: AdapterTransaction | null | undefined
): TransferPair {
  const anchor = projectTransaction(rawAnchor, 'actual_transfer_pair');
  const targetId = meaningfulId(anchor.transfer_id);
  const counterpart = rawCounterpart == null ? null : projectTransaction(rawCounterpart, 'actual_transfer_pair');
  const reasons: TransferIntegrityReason[] = [];
  if (!targetId) reasons.push('MALFORMED_RELATIONSHIP_ID');
  if (targetId && !counterpart) reasons.push('MISSING_COUNTERPART');
  if (counterpart) {
    if (meaningfulId(counterpart.transfer_id) !== anchor.id || targetId !== counterpart.id) reasons.push('NON_RECIPROCAL_RELATIONSHIP');
    if (anchor.account === counterpart.account) reasons.push('SAME_ACCOUNT');
    if (anchor.amount === 0 || counterpart.amount === 0) reasons.push('ZERO_AMOUNT');
    if (Math.sign(anchor.amount) === Math.sign(counterpart.amount)) reasons.push('SAME_SIGN');
    if (Math.abs(anchor.amount) !== Math.abs(counterpart.amount)) reasons.push('MAGNITUDE_MISMATCH');
  }
  const [transactionA, transactionB] = orderedObserved(anchor, counterpart);
  const valid = reasons.length === 0 && counterpart !== null;
  const fromTransaction = valid ? (anchor.amount < 0 ? anchor : counterpart) : null;
  const toTransaction = valid ? (anchor.amount > 0 ? anchor : counterpart) : null;
  return {
    pairKey: pairKey(anchor.id, counterpart?.id ?? targetId ?? anchor.id),
    transactionA,
    transactionB,
    integrity: valid ? 'VALID' : 'INVALID',
    reasonCodes: reasons,
    fromTransaction,
    toTransaction,
    magnitude: valid ? Math.abs(anchor.amount) : null
  };
}

export function assembleTransferPairs(transactions: readonly AdapterTransaction[]): TransferPair[] {
  const projected = transactions.map(transaction => projectTransaction(transaction, 'actual_transfer_pairs'));
  const byId = new Map(projected.map(transaction => [transaction.id, transaction]));
  const byKey = new Map<string, TransferPair>();
  for (const transaction of projected) {
    const targetId = meaningfulId(transaction.transfer_id);
    if (!targetId) continue;
    const pair = assembleTransferPair(transaction, byId.get(targetId));
    const existing = byKey.get(pair.pairKey);
    if (!existing || (existing.transactionB === null && pair.transactionB !== null)) byKey.set(pair.pairKey, pair);
  }
  return [...byKey.values()].sort(compareTransferPairs);
}

export type TransferSort = 'date_desc' | 'date_asc' | 'magnitude_desc' | 'magnitude_asc';

export interface TransferSearchRequest {
  startDate: string;
  endDate: string;
  accountIds?: string[];
  minMagnitude?: number;
  maxMagnitude?: number;
  integrity?: 'any' | TransferIntegrity;
  sort?: TransferSort;
  limit: number;
  offset: number;
}

export interface CreateTransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  notes?: string;
  categoryId?: string;
  fromCleared?: boolean;
  toCleared?: boolean;
  dryRun?: boolean;
  confirmWrite?: boolean;
}

export function compareTransferPairs(a: TransferPair, b: TransferPair, sort: TransferSort = 'date_desc'): number {
  const dateA = a.transactionA?.date ?? a.transactionB?.date ?? '';
  const dateB = b.transactionA?.date ?? b.transactionB?.date ?? '';
  const magnitudeA = a.magnitude ?? Math.abs(a.transactionA?.amount ?? a.transactionB?.amount ?? 0);
  const magnitudeB = b.magnitude ?? Math.abs(b.transactionA?.amount ?? b.transactionB?.amount ?? 0);
  const primary = sort === 'date_desc' ? dateB.localeCompare(dateA)
    : sort === 'date_asc' ? dateA.localeCompare(dateB)
      : sort === 'magnitude_desc' ? magnitudeB - magnitudeA
        : magnitudeA - magnitudeB;
  return primary || a.pairKey.localeCompare(b.pairKey);
}
