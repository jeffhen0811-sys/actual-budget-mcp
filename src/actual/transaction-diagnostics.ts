import type { AdapterTransaction } from './adapter.js';
import { candidateKey, meaningfulId } from './transfers.js';
import { projectTransaction } from './transactions.js';

export type PossibleTransferClassification = 'UNIQUE' | 'AMBIGUOUS';
export type DuplicateClassification = 'STRONG' | 'LIKELY';

export interface PossibleTransferCandidate {
  candidateKey: string;
  transactionA: AdapterTransaction;
  transactionB: AdapterTransaction;
  classification: PossibleTransferClassification;
  leftCandidateCount: number;
  rightCandidateCount: number;
  dateDifferenceDays: number;
  reasonCodes: Array<'OPPOSITE_AMOUNT' | 'SAME_DATE' | 'DATE_WITHIN_WINDOW'>;
}

export interface PossibleDuplicateCandidate {
  candidateKey: string;
  transactionA: AdapterTransaction;
  transactionB: AdapterTransaction;
  classification: DuplicateClassification;
  dateDifferenceDays: number;
  reasonCodes: Array<'SAME_IMPORTED_ID' | 'SAME_DATE' | 'SAME_PAYEE' | 'SAME_IMPORTED_PAYEE' | 'DATE_WITHIN_WINDOW'>;
}

function day(value: string): number { return Math.floor(Date.parse(`${value}T00:00:00Z`) / 86_400_000); }
function dateDifference(a: AdapterTransaction, b: AdapterTransaction): number { return Math.abs(day(a.date) - day(b.date)); }

export function isDiagnosticLeaf(transaction: AdapterTransaction): boolean {
  return transaction.is_parent !== true && transaction.is_child !== true && transaction.parent_id == null &&
    transaction.starting_balance_flag !== true && meaningfulId(transaction.transfer_id) === null;
}

function ordered(a: AdapterTransaction, b: AdapterTransaction): [AdapterTransaction, AdapterTransaction] {
  return a.id.localeCompare(b.id) <= 0 ? [a, b] : [b, a];
}

export function findPossibleTransferCandidates(
  rawTransactions: readonly AdapterTransaction[],
  dateWindowDays: number
): PossibleTransferCandidate[] {
  const transactions = rawTransactions.map(row => projectTransaction(row, 'actual_find_possible_transfers')).filter(isDiagnosticLeaf);
  const eligible: Array<[AdapterTransaction, AdapterTransaction, number]> = [];
  const degrees = new Map<string, number>();
  const byAmount = new Map<number, AdapterTransaction[]>();
  for (const transaction of transactions) {
    const group = byAmount.get(transaction.amount) ?? [];
    group.push(transaction);
    byAmount.set(transaction.amount, group);
  }
  for (const a of transactions.filter(transaction => transaction.amount < 0)) for (const b of byAmount.get(-a.amount) ?? []) {
    const difference = dateDifference(a, b);
    if (a.account === b.account || difference > dateWindowDays) continue;
    eligible.push([a, b, difference]);
    degrees.set(a.id, (degrees.get(a.id) ?? 0) + 1);
    degrees.set(b.id, (degrees.get(b.id) ?? 0) + 1);
  }
  return eligible.map(([first, second, difference]) => {
    const [transactionA, transactionB] = ordered(first, second);
    const leftCandidateCount = degrees.get(transactionA.id)!;
    const rightCandidateCount = degrees.get(transactionB.id)!;
    const reasonCodes: PossibleTransferCandidate['reasonCodes'] = difference === 0
      ? ['OPPOSITE_AMOUNT', 'SAME_DATE']
      : ['OPPOSITE_AMOUNT', 'DATE_WITHIN_WINDOW'];
    return {
      candidateKey: candidateKey(transactionA.id, transactionB.id),
      transactionA,
      transactionB,
      classification: leftCandidateCount === 1 && rightCandidateCount === 1 ? 'UNIQUE' as const : 'AMBIGUOUS' as const,
      leftCandidateCount,
      rightCandidateCount,
      dateDifferenceDays: difference,
      reasonCodes
    };
  }).sort((a, b) => a.transactionA.date.localeCompare(b.transactionA.date) || a.candidateKey.localeCompare(b.candidateKey));
}

function sameMeaningful(a: unknown, b: unknown): boolean {
  return typeof a === 'string' && a.trim().length > 0 && typeof b === 'string' && b.trim().length > 0 && a.trim() === b.trim();
}

export function findPossibleDuplicateCandidates(
  rawTransactions: readonly AdapterTransaction[],
  dateWindowDays: number
): PossibleDuplicateCandidate[] {
  const transactions = rawTransactions.map(row => projectTransaction(row, 'actual_find_possible_duplicates')).filter(isDiagnosticLeaf);
  const candidates: PossibleDuplicateCandidate[] = [];
  for (let i = 0; i < transactions.length; i += 1) for (let j = i + 1; j < transactions.length; j += 1) {
    const first = transactions[i]!;
    const second = transactions[j]!;
    if (first.account !== second.account || first.amount !== second.amount) continue;
    const difference = dateDifference(first, second);
    const sameImportedId = sameMeaningful(first.imported_id, second.imported_id);
    const samePayee = meaningfulId(first.payee) !== null && meaningfulId(first.payee) === meaningfulId(second.payee);
    const sameImportedPayee = sameMeaningful(first.imported_payee, second.imported_payee);
    if (!sameImportedId && (!(samePayee || sameImportedPayee) || difference > dateWindowDays)) continue;
    const [transactionA, transactionB] = ordered(first, second);
    const reasonCodes: PossibleDuplicateCandidate['reasonCodes'] = [];
    if (sameImportedId) reasonCodes.push('SAME_IMPORTED_ID');
    if (difference === 0) reasonCodes.push('SAME_DATE');
    else if (difference <= dateWindowDays) reasonCodes.push('DATE_WITHIN_WINDOW');
    if (samePayee) reasonCodes.push('SAME_PAYEE');
    if (sameImportedPayee) reasonCodes.push('SAME_IMPORTED_PAYEE');
    candidates.push({
      candidateKey: candidateKey(transactionA.id, transactionB.id),
      transactionA,
      transactionB,
      classification: sameImportedId || difference === 0 ? 'STRONG' : 'LIKELY',
      dateDifferenceDays: difference,
      reasonCodes
    });
  }
  return candidates.sort((a, b) => a.transactionA.date.localeCompare(b.transactionA.date) || a.candidateKey.localeCompare(b.candidateKey));
}

export interface DiagnosticSearchRequest<T extends string> {
  startDate: string;
  endDate: string;
  accountIds?: string[];
  minMagnitude?: number;
  maxMagnitude?: number;
  dateWindowDays: number;
  classification?: 'any' | T;
  sort?: 'date_asc' | 'date_desc' | 'magnitude_asc' | 'magnitude_desc';
  limit: number;
  offset: number;
}

export function sortDiagnosticCandidates<T extends { candidateKey: string; transactionA: AdapterTransaction }>(
  candidates: T[], sort: DiagnosticSearchRequest<string>['sort'] = 'date_asc'
): T[] {
  return candidates.sort((a, b) => {
    const date = sort === 'date_desc' ? b.transactionA.date.localeCompare(a.transactionA.date)
      : sort === 'date_asc' ? a.transactionA.date.localeCompare(b.transactionA.date)
        : 0;
    const magnitude = sort === 'magnitude_desc' ? Math.abs(b.transactionA.amount) - Math.abs(a.transactionA.amount)
      : sort === 'magnitude_asc' ? Math.abs(a.transactionA.amount) - Math.abs(b.transactionA.amount)
        : 0;
    return date || magnitude || a.candidateKey.localeCompare(b.candidateKey);
  });
}
