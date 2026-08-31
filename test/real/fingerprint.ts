import { createHash } from 'node:crypto';
import { CARD_TEST_ACCOUNT_NAME, REQUIRED_TEST_ACCOUNT_NAME } from './env.js';

interface FingerprintReader {
  listAccounts(): Promise<Array<{ id: string; name: string; offbudget: boolean; closed: boolean; balance?: number | undefined; balanceError?: string | undefined }>>;
  listCategories(): Promise<Array<{ groupId: string; groupName: string; categories: Array<{ id: string; name: string; hidden: boolean }> }>>;
  listPayees(): Promise<Array<{ id: string; name: string }>>;
  listRules(): Promise<Array<{
    id: string;
    stage: string;
    conditionsOp: string;
    conditions: unknown[];
    actions: unknown[];
    writable: boolean;
    writeRestriction?: string | undefined;
  }>>;
  getTransactions(accountId: string, startDate: string, endDate: string): Promise<Array<{ id: string; [key: string]: unknown }>>;
}

function stable<T>(values: T[], key: (value: T) => string): T[] {
  return [...values].sort((left, right) => key(left).localeCompare(key(right)));
}

export async function permanentFixtureFingerprint(reader: FingerprintReader): Promise<string> {
  const accounts = await reader.listAccounts();
  const permanent = stable(accounts.filter(account => [REQUIRED_TEST_ACCOUNT_NAME, CARD_TEST_ACCOUNT_NAME].includes(account.name)), account => account.id);
  if (permanent.length !== 2) throw new Error('Permanent fixture fingerprint requires both named test accounts.');
  const transactions = [];
  for (const account of permanent) {
    transactions.push(...await reader.getTransactions(account.id, '2026-08-01', '2026-08-31'));
  }
  const payload = {
    accounts: permanent,
    transactions: stable(transactions, transaction => transaction.id),
    categories: stable(await reader.listCategories(), group => group.groupId).map(group => ({
      ...group,
      categories: stable(group.categories, category => category.id)
    })),
    payees: stable(await reader.listPayees(), payee => payee.id),
    rules: stable(await reader.listRules(), rule => rule.id)
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
