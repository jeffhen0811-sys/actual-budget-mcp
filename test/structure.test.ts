import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdapterAccount, AdapterCategory, AdapterCategoryGroup } from '../src/actual/adapter.js';
import { ActualClient } from '../src/actual/client.js';
import type { ActualConfig } from '../src/config.js';
import { fakeAdapter } from './helpers.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

async function fixture() {
  const dataDir = await mkdtemp(join(tmpdir(), 'actual-structure-'));
  directories.push(dataDir);
  const config: ActualConfig = { serverUrl: 'http://actual.local:5006', password: 'secret', syncId: 'budget', dataDir };
  const api = fakeAdapter();
  return { api, client: new ActualClient(api, async () => config) };
}

describe('structural administration', () => {
  it('creates with a signed opening balance, updates allowlisted fields, and skips identical updates', async () => {
    const { api, client } = await fixture();
    const accounts: AdapterAccount[] = [];
    vi.mocked(api.getAccounts).mockImplementation(async () => accounts);
    vi.mocked(api.createAccount).mockImplementation(async account => {
      accounts.push({ id: 'created', ...account });
      return 'created';
    });
    vi.mocked(api.updateAccount).mockImplementation(async (id, fields) => { Object.assign(accounts.find(account => account.id === id)!, fields); });

    await expect(client.createAccount('Signed account', false, -12030)).resolves.toMatchObject({
      success: true, changed: true, account: { id: 'created', name: 'Signed account', offbudget: false, closed: false }
    });
    expect(api.createAccount).toHaveBeenCalledWith({ name: 'Signed account', offbudget: false, closed: false }, -12030);
    await expect(client.updateAccount('created', { name: 'Renamed' })).resolves.toMatchObject({ changed: true, account: { name: 'Renamed' } });
    const syncCount = vi.mocked(api.sync).mock.calls.length;
    await expect(client.updateAccount('created', { name: 'Renamed' })).resolves.toMatchObject({ changed: false });
    expect(api.updateAccount).toHaveBeenCalledOnce();
    expect(api.sync).toHaveBeenCalledTimes(syncCount);
    await client.shutdown();
  });

  it('refuses unsafe close and nonempty deletion, then safely closes, reopens, and deletes an empty account', async () => {
    const { api, client } = await fixture();
    const accounts: AdapterAccount[] = [{ id: 'account', name: 'Account', offbudget: false, closed: false }];
    let history: Array<{ id: string; account: string; date: string; amount: number }> = [];
    vi.mocked(api.getAccounts).mockImplementation(async () => accounts);
    vi.mocked(api.getAllTransactions).mockImplementation(async () => history);
    vi.mocked(api.closeAccount).mockImplementation(async () => { accounts[0]!.closed = true; });
    vi.mocked(api.reopenAccount).mockImplementation(async () => { accounts[0]!.closed = false; });
    vi.mocked(api.deleteAccount).mockImplementation(async () => { accounts.splice(0); });

    await expect(client.closeAccount('account')).rejects.toMatchObject({ code: 'UNSAFE_CLOSE_WOULD_DELETE_ACCOUNT' });
    expect(api.closeAccount).not.toHaveBeenCalled();
    history = [{ id: 't', account: 'account', date: '2026-08-01', amount: 0 }];
    await expect(client.closeAccount('account')).resolves.toMatchObject({ changed: true, account: { closed: true } });
    await expect(client.closeAccount('account')).resolves.toMatchObject({ changed: false });
    await expect(client.reopenAccount('account')).resolves.toMatchObject({ changed: true, account: { closed: false } });
    await expect(client.deleteAccount('account')).rejects.toMatchObject({ code: 'ACCOUNT_NOT_EMPTY', retryable: false });
    history = [];
    await expect(client.deleteAccount('account')).resolves.toEqual({
      success: true, deletedAccountId: 'account', deletedAccountName: 'Account', relatedTransactionCount: 0
    });
    await client.shutdown();
  });

  it('derives category type, enforces compatible moves, visibility idempotency, and empty-group deletion', async () => {
    const { api, client } = await fixture();
    const groups: AdapterCategoryGroup[] = [
      { id: 'expense-a', name: 'Expense A', is_income: false, hidden: false },
      { id: 'expense-b', name: 'Expense B', is_income: false, hidden: false },
      { id: 'income', name: 'Income', is_income: true, hidden: false }
    ];
    const categories: AdapterCategory[] = [];
    vi.mocked(api.getCategoryGroups).mockImplementation(async () => groups);
    vi.mocked(api.getCategories).mockImplementation(async () => categories);
    vi.mocked(api.createCategory).mockImplementation(async category => { categories.push({ id: 'category', ...category }); return 'category'; });
    vi.mocked(api.updateCategory).mockImplementation(async (id, fields) => { Object.assign(categories.find(category => category.id === id)!, fields); });
    vi.mocked(api.deleteCategory).mockImplementation(async id => { categories.splice(categories.findIndex(category => category.id === id), 1); });
    vi.mocked(api.deleteCategoryGroup).mockImplementation(async id => { groups.splice(groups.findIndex(group => group.id === id), 1); });

    await expect(client.createCategory('Food', 'expense-a')).resolves.toMatchObject({
      changed: true, category: { groupId: 'expense-a', isIncome: false, hidden: false }
    });
    expect(api.createCategory).toHaveBeenCalledWith({ name: 'Food', group_id: 'expense-a', is_income: false, hidden: false });
    await expect(client.moveCategory('category', 'income')).rejects.toMatchObject({ code: 'INCOMPATIBLE_CATEGORY_GROUP_TYPE' });
    await expect(client.moveCategory('category', 'expense-b')).resolves.toMatchObject({ changed: true, category: { groupId: 'expense-b' } });
    await expect(client.hideCategory('category')).resolves.toMatchObject({ changed: true, category: { hidden: true } });
    const syncCount = vi.mocked(api.sync).mock.calls.length;
    await expect(client.hideCategory('category')).resolves.toMatchObject({ changed: false });
    expect(api.sync).toHaveBeenCalledTimes(syncCount);
    await expect(client.deleteCategoryGroup('expense-b')).rejects.toMatchObject({ code: 'CATEGORY_GROUP_NOT_EMPTY' });
    await expect(client.deleteCategory('category')).resolves.toMatchObject({ deletedCategoryId: 'category' });
    await expect(client.deleteCategoryGroup('expense-b')).resolves.toMatchObject({ deletedCategoryGroupId: 'expense-b' });
    await client.shutdown();
  });

  it('fails closed for transaction, budget, carryover, and malformed category-use scans', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getCategories).mockResolvedValue([{ id: 'category', name: 'Food', group_id: 'group', is_income: false, hidden: false }]);
    vi.mocked(api.getAccounts).mockResolvedValue([{ id: 'account', name: 'Account', offbudget: false, closed: false }]);
    vi.mocked(api.getAllTransactions).mockResolvedValue([{ id: 't', account: 'account', date: '2026-08-01', amount: -1, category: 'category' }]);
    await expect(client.deleteCategory('category')).rejects.toMatchObject({ code: 'CATEGORY_IN_USE', metadata: { details: { relatedTransactionCount: 1 } } });

    vi.mocked(api.getAllTransactions).mockResolvedValue([]);
    vi.mocked(api.getBudgetMonths).mockResolvedValue(['2026-08']);
    vi.mocked(api.getBudgetMonth).mockResolvedValue({
      month: '2026-08', categoryGroups: [{ categories: [{ id: 'category', budgeted: 100, carryover: true }] }]
    });
    await expect(client.deleteCategory('category')).rejects.toMatchObject({ code: 'CATEGORY_IN_USE' });
    vi.mocked(api.getBudgetMonth).mockResolvedValue({
      month: '2026-08', categoryGroups: [{ categories: [{ id: 'category', budgeted: 0, carryover: 1 }] }]
    });
    await expect(client.deleteCategory('category')).rejects.toMatchObject({ code: 'PREFLIGHT_INCONCLUSIVE' });
    vi.mocked(api.getBudgetMonth).mockResolvedValue({ month: '2026-08', categoryGroups: [{}] });
    await expect(client.deleteCategory('category')).rejects.toMatchObject({ code: 'PREFLIGHT_INCONCLUSIVE' });
    expect(api.deleteCategory).not.toHaveBeenCalled();
    await client.shutdown();
  });

  it('never retries partial mutations and reports sync and final-read recovery state', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.createAccount).mockResolvedValue('created');
    vi.mocked(api.getAccounts).mockResolvedValue([{ id: 'created', name: 'Account', offbudget: false, closed: false }]);
    vi.mocked(api.sync).mockRejectedValueOnce(new Error('network failure'));
    await expect(client.createAccount('Account')).rejects.toMatchObject({
      code: 'MUTATION_SYNC_FAILED', retryable: false,
      metadata: { recoveryAction: 'actual_sync', state: 'local_change_may_have_succeeded', partialState: true }
    });
    expect(api.createAccount).toHaveBeenCalledOnce();

    vi.mocked(api.getAccounts).mockResolvedValue([]);
    await expect(client.createAccount('Second')).rejects.toMatchObject({
      code: 'POST_MUTATION_READ_FAILED', retryable: false,
      metadata: { state: 'synchronized_but_unverified', partialState: true }
    });
    expect(api.createAccount).toHaveBeenCalledTimes(2);
    await client.shutdown();
  });

  it('keeps structural preflight, mutation, sync, and verification in one FIFO position', async () => {
    const { api, client } = await fixture();
    const events: string[] = [];
    let release!: () => void;
    vi.mocked(api.createAccount).mockImplementation(async account => {
      events.push('mutation-start');
      await new Promise<void>(resolve => { release = resolve; });
      events.push('mutation-end');
      vi.mocked(api.getAccounts).mockResolvedValue([{ id: 'created', ...account }]);
      return 'created';
    });
    vi.mocked(api.sync).mockImplementation(async () => { events.push('sync'); });
    vi.mocked(api.getPayees).mockImplementation(async () => { events.push('unrelated-read'); return []; });
    const mutation = client.createAccount('Account');
    const read = client.listPayees();
    await vi.waitFor(() => expect(events).toEqual(['mutation-start']));
    release();
    await Promise.all([mutation, read]);
    expect(events).toEqual(['mutation-start', 'mutation-end', 'sync', 'unrelated-read']);
    await client.shutdown();
  });
});
