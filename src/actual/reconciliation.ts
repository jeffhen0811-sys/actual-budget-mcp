import { PublicError } from '../errors.js';
import type { AdapterTransaction } from './adapter.js';
import { projectTransaction } from './transactions.js';

export type ReconciliationStatus =
  | 'NO_STATEMENT'
  | 'MATCHES_BOTH'
  | 'MATCHES_CLEARED'
  | 'MATCHES_LEDGER'
  | 'DIFFERENCE';

export interface ReconciliationAggregate {
  balances: { ledger: number; cleared: number; reconciled: number; uncleared: number };
  counts: { ledger: number; cleared: number; reconciled: number; uncleared: number };
  statement: null | {
    balance: number;
    differenceFromLedger: number;
    differenceFromCleared: number;
    status: Exclude<ReconciliationStatus, 'NO_STATEMENT'>;
  };
  status: ReconciliationStatus;
}

export function aggregateReconciliation(
  rawTransactions: readonly AdapterTransaction[],
  statementBalance?: number
): ReconciliationAggregate {
  const leaves = rawTransactions.map(row => projectTransaction(row, 'actual_get_account_reconciliation'))
    .filter(row => row.is_parent !== true);
  let ledger = 0;
  let cleared = 0;
  let reconciled = 0;
  let directUncleared = 0;
  let clearedCount = 0;
  let reconciledCount = 0;
  let unclearedCount = 0;
  for (const row of leaves) {
    ledger += row.amount;
    const isReconciled = row.reconciled === true;
    const isCleared = row.cleared === true || isReconciled;
    if (isCleared) { cleared += row.amount; clearedCount += 1; }
    else { directUncleared += row.amount; unclearedCount += 1; }
    if (isReconciled) { reconciled += row.amount; reconciledCount += 1; }
  }
  const uncleared = ledger - cleared;
  if (uncleared !== directUncleared) throw new PublicError(
    'QUERY_SHAPE_INVALID', 'Canonical uncleared transaction sums are inconsistent.', 'actual_get_account_reconciliation', false,
    { details: { ledger, cleared, computedUncleared: uncleared, directUncleared } }
  );
  if (statementBalance === undefined) return {
    balances: { ledger, cleared, reconciled, uncleared },
    counts: { ledger: leaves.length, cleared: clearedCount, reconciled: reconciledCount, uncleared: unclearedCount },
    statement: null,
    status: 'NO_STATEMENT'
  };
  const differenceFromLedger = statementBalance - ledger;
  const differenceFromCleared = statementBalance - cleared;
  const status = differenceFromLedger === 0 && differenceFromCleared === 0 ? 'MATCHES_BOTH'
    : differenceFromCleared === 0 ? 'MATCHES_CLEARED'
      : differenceFromLedger === 0 ? 'MATCHES_LEDGER'
        : 'DIFFERENCE';
  return {
    balances: { ledger, cleared, reconciled, uncleared },
    counts: { ledger: leaves.length, cleared: clearedCount, reconciled: reconciledCount, uncleared: unclearedCount },
    statement: { balance: statementBalance, differenceFromLedger, differenceFromCleared, status },
    status
  };
}
