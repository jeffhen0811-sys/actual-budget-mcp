import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActualClient } from '../src/actual/client.js';
import type { AdapterRule } from '../src/actual/adapter.js';
import { fakeAdapter } from './helpers.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

async function fixture() {
  const dataDir = await mkdtemp(join(tmpdir(), 'actual-payee-rule-'));
  directories.push(dataDir);
  const api = fakeAdapter();
  const client = new ActualClient(api, async () => ({
    serverUrl: 'http://actual.example:5006', password: 'payee-rule-sentinel', syncId: 'budget', dataDir
  }));
  return { api, client };
}

function supportedRule(overrides: Partial<AdapterRule> = {}): AdapterRule {
  return {
    id: 'rule-id',
    stage: null,
    conditionsOp: 'and',
    conditions: [{ field: 'imported_payee', op: 'contains', value: 'market', type: 'string' }],
    actions: [{ op: 'set', field: 'payee', value: 'payee-id', type: 'id' }],
    ...overrides
  };
}

describe('serialized payee administration', () => {
  it('gets ordinary and transfer payees and returns structured not found', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getPayees).mockResolvedValue([
      { id: 'ordinary', name: 'Cafe', transfer_acct: null },
      { id: 'transfer', name: 'Checking', transfer_acct: 'account-id' }
    ]);
    await expect(client.getPayee('ordinary')).resolves.toEqual({ id: 'ordinary', name: 'Cafe', transferAccountId: null });
    await expect(client.getPayee('transfer')).resolves.toEqual({ id: 'transfer', name: 'Checking', transferAccountId: 'account-id' });
    await expect(client.getPayee('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await client.shutdown();
  });

  it('trims create names, reuses one exact ordinary match, and refuses ambiguity', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'existing', name: 'Cafe', transfer_acct: null }]);
    await expect(client.createPayee('  Cafe  ')).resolves.toMatchObject({ changed: false, payee: { id: 'existing' } });
    expect(api.createPayee).not.toHaveBeenCalled();
    vi.mocked(api.getPayees).mockResolvedValue([
      { id: 'one', name: 'Duplicate', transfer_acct: null },
      { id: 'two', name: 'Duplicate', transfer_acct: null }
    ]);
    await expect(client.createPayee('Duplicate')).rejects.toMatchObject({ code: 'NAME_CONFLICT' });
    await expect(client.createPayee('   ')).rejects.toMatchObject({ code: 'CONFIGURATION_ERROR' });
    await client.shutdown();
  });

  it('creates, synchronizes, reads back, and verifies an ordinary payee', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getPayees).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'created', name: 'Cafe', transfer_acct: null }]);
    vi.mocked(api.createPayee).mockResolvedValue('created');
    await expect(client.createPayee('Cafe')).resolves.toEqual({
      success: true, changed: true, payee: { id: 'created', name: 'Cafe', transferAccountId: null }
    });
    expect(api.createPayee).toHaveBeenCalledWith({ name: 'Cafe' });
    expect(api.sync).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('protects transfer payees and handles desired-state rename no-ops', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'transfer', name: 'Checking', transfer_acct: 'account' }]);
    await expect(client.updatePayee('transfer', 'Renamed')).rejects.toMatchObject({ code: 'TRANSFER_PAYEE_PROTECTED' });
    expect(api.updatePayee).not.toHaveBeenCalled();
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'ordinary', name: 'Cafe', transfer_acct: null }]);
    await expect(client.updatePayee('ordinary', ' Cafe ')).resolves.toMatchObject({ changed: false });
    expect(api.sync).not.toHaveBeenCalled();
    await client.shutdown();
  });

  it('scans parent and subtransaction references before deletion and returns safe preflight counts', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'payee', name: 'Cafe', transfer_acct: null }]);
    vi.mocked(api.getAccounts).mockResolvedValue([{ id: 'account', name: 'Checking' }]);
    vi.mocked(api.getAllTransactions).mockResolvedValue([{
      id: 'parent', account: 'account', date: '2026-08-01', amount: -100,
      subtransactions: [{ id: 'child', account: 'account', date: '2026-08-01', amount: -100, payee: 'payee' }]
    }]);
    vi.mocked(api.getPayeeRules).mockResolvedValue([supportedRule()]);
    await expect(client.deletePayee('payee', false)).rejects.toMatchObject({
      code: 'DESTRUCTIVE_CONFIRMATION_REQUIRED',
      metadata: { details: { relatedTransactionCount: 1, relatedRuleCount: 1 } }
    });
    await expect(client.deletePayee('payee', true)).rejects.toMatchObject({ code: 'PAYEE_IN_USE' });
    expect(api.deletePayee).not.toHaveBeenCalled();
    await client.shutdown();
  });

  it('fails closed on inconclusive deletion preflight and deletes only after verified zero use', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'payee', name: 'Cafe', transfer_acct: null }]);
    vi.mocked(api.getAccounts).mockResolvedValue([{ id: 'account', name: 'Checking' }]);
    vi.mocked(api.getAllTransactions).mockRejectedValueOnce(new Error('read failed'));
    await expect(client.deletePayee('payee', true)).rejects.toMatchObject({ code: 'PREFLIGHT_INCONCLUSIVE' });
    expect(api.deletePayee).not.toHaveBeenCalled();

    vi.mocked(api.getAllTransactions).mockResolvedValue([]);
    vi.mocked(api.getPayeeRules).mockResolvedValue([]);
    vi.mocked(api.getPayees).mockResolvedValueOnce([{ id: 'payee', name: 'Cafe', transfer_acct: null }]).mockResolvedValueOnce([]);
    await expect(client.deletePayee('payee', true)).resolves.toMatchObject({ deletedPayeeId: 'payee', relatedTransactionCount: 0, relatedRuleCount: 0 });
    expect(api.deletePayee).toHaveBeenCalledWith('payee');
    await client.shutdown();
  });

  it('merges once and verifies source absence plus transaction and rule remapping', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getPayees)
      .mockResolvedValueOnce([{ id: 'target', name: 'Target', transfer_acct: null }, { id: 'source', name: 'Source', transfer_acct: null }])
      .mockResolvedValueOnce([{ id: 'target', name: 'Target', transfer_acct: null }]);
    vi.mocked(api.getAccounts).mockResolvedValue([{ id: 'account', name: 'Checking' }]);
    vi.mocked(api.getAllTransactions)
      .mockResolvedValueOnce([{ id: 'transaction', account: 'account', date: '2026-08-01', amount: -100, payee: 'source' }])
      .mockResolvedValueOnce([{ id: 'transaction', account: 'account', date: '2026-08-01', amount: -100, payee: 'target' }]);
    vi.mocked(api.getPayeeRules).mockResolvedValueOnce([supportedRule()]).mockResolvedValueOnce([supportedRule()]);
    await expect(client.mergePayees(['source'], 'target', true)).resolves.toMatchObject({
      mergedSourcePayeeIds: ['source'], impacts: [{ relatedTransactionCount: 1, relatedRuleCount: 1 }]
    });
    expect(api.mergePayees).toHaveBeenCalledOnce();
    expect(api.mergePayees).toHaveBeenCalledWith('target', ['source']);
    await client.shutdown();
  });

  it('never retries a merge and reports partial state on sync or verification failure', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'target', name: 'Target', transfer_acct: null }, { id: 'source', name: 'Source', transfer_acct: null }]);
    vi.mocked(api.getPayeeRules).mockResolvedValue([]);
    vi.mocked(api.sync).mockRejectedValue(new Error('network failure'));
    await expect(client.mergePayees(['source'], 'target', true)).rejects.toMatchObject({
      code: 'MERGE_PARTIAL_STATE', metadata: { partialState: true, recoveryAction: 'actual_sync' }
    });
    expect(api.mergePayees).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('rejects invalid merge relationships and reports unverifiable synchronized outcomes without retry', async () => {
    const { api, client } = await fixture();
    await expect(client.mergePayees([], 'target', true)).rejects.toMatchObject({ code: 'CONFIGURATION_ERROR' });
    expect(api.getPayees).not.toHaveBeenCalled();
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'target', name: 'Target', transfer_acct: null }, { id: 'source', name: 'Source', transfer_acct: null }]);
    vi.mocked(api.getPayeeRules).mockResolvedValue([]);
    await expect(client.mergePayees(['source'], 'target', true)).rejects.toMatchObject({
      code: 'MERGE_PARTIAL_STATE', metadata: { partialState: true }
    });
    expect(api.mergePayees).toHaveBeenCalledOnce();
    await client.shutdown();
  });
});

describe('serialized rule administration', () => {
  it('preserves official order, normalizes stages, and exposes advanced rules as read-only', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getRules).mockResolvedValue([
      supportedRule({ id: 'pre', stage: 'pre' }),
      supportedRule({ id: 'default', stage: null }),
      supportedRule({ id: 'advanced', stage: 'post', actions: [{ op: 'delete-transaction', field: null, value: '' }] })
    ]);
    const rules = await client.listRules();
    expect(rules.map(rule => [rule.id, rule.stage])).toEqual([['pre', 'pre'], ['default', 'default'], ['advanced', 'post']]);
    expect(rules[2]).toMatchObject({ writable: false, writeRestriction: expect.any(String) });
    await expect(client.getRule('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await client.shutdown();
  });

  it('creates a rule with default-to-null translation, exact payload, reference validation, sync, and ID read-back', async () => {
    const { api, client } = await fixture();
    const draft = {
      stage: 'default' as const,
      conditionsOp: 'and' as const,
      conditions: [{ field: 'imported_payee', op: 'contains', value: 'market' }],
      actions: [{ op: 'set', field: 'payee', value: 'payee-id' }]
    };
    const persisted = supportedRule();
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'payee-id', name: 'Market', transfer_acct: null }]);
    vi.mocked(api.createRule).mockResolvedValue(persisted);
    vi.mocked(api.getRules).mockResolvedValue([persisted]);
    await expect(client.createRule(draft)).resolves.toMatchObject({ changed: true, rule: { id: 'rule-id', stage: 'default' } });
    expect(api.createRule).toHaveBeenCalledWith({ stage: null, conditionsOp: 'and', conditions: draft.conditions, actions: draft.actions });
    expect(api.sync).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('rejects missing references and advanced updates before mutation', async () => {
    const { api, client } = await fixture();
    await expect(client.createRule({
      stage: 'pre', conditionsOp: 'and',
      conditions: [{ field: 'payee', op: 'is', value: 'missing' }],
      actions: [{ op: 'set', field: 'notes', value: 'note' }]
    })).rejects.toMatchObject({ code: 'INVALID_REFERENCE' });
    expect(api.createRule).not.toHaveBeenCalled();

    vi.mocked(api.getRules).mockResolvedValue([supportedRule({ actions: [{ op: 'link-schedule', field: null, value: 'schedule', type: 'id' }] })]);
    await expect(client.updateRule('rule-id', { stage: 'post' })).rejects.toMatchObject({ code: 'UNSUPPORTED_RULE_SHAPE' });
    expect(api.updateRule).not.toHaveBeenCalled();
    await client.shutdown();
  });

  it('returns no-op updates and sends the complete rule object for changed updates', async () => {
    const { api, client } = await fixture();
    const current = supportedRule();
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'payee-id', name: 'Market', transfer_acct: null }]);
    vi.mocked(api.getRules).mockResolvedValueOnce([current]);
    await expect(client.updateRule('rule-id', { stage: 'default' })).resolves.toMatchObject({ changed: false });
    expect(api.updateRule).not.toHaveBeenCalled();
    expect(api.sync).not.toHaveBeenCalled();

    const updated = supportedRule({ stage: 'post' });
    vi.mocked(api.getRules).mockResolvedValueOnce([current]).mockResolvedValueOnce([updated]);
    await expect(client.updateRule('rule-id', { stage: 'post' })).resolves.toMatchObject({ changed: true, rule: { stage: 'post' } });
    expect(api.updateRule).toHaveBeenCalledWith(expect.objectContaining({
      id: 'rule-id', stage: 'post', conditionsOp: 'and', conditions: current.conditions, actions: current.actions
    }));
    await client.shutdown();
  });

  it('respects protected rule deletion and verifies successful absence', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getRules).mockResolvedValue([supportedRule()]);
    vi.mocked(api.deleteRule).mockResolvedValue(false);
    await expect(client.deleteRule('rule-id', false)).rejects.toMatchObject({ code: 'DESTRUCTIVE_CONFIRMATION_REQUIRED' });
    await expect(client.deleteRule('rule-id', true)).rejects.toMatchObject({ code: 'PROTECTED_ACTUAL_ENTITY' });
    expect(api.sync).not.toHaveBeenCalled();

    vi.mocked(api.deleteRule).mockResolvedValue(true);
    vi.mocked(api.getRules).mockResolvedValueOnce([supportedRule()]).mockResolvedValueOnce([]);
    await expect(client.deleteRule('rule-id', true)).resolves.toEqual({ success: true, deletedRuleId: 'rule-id' });
    expect(api.sync).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('reports rule synchronization and read-back failures as non-retryable partial state', async () => {
    const { api, client } = await fixture();
    const draft = {
      stage: 'default' as const, conditionsOp: 'and' as const,
      conditions: [{ field: 'imported_payee', op: 'contains', value: 'market' }],
      actions: [{ op: 'set', field: 'payee', value: 'payee-id' }]
    };
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'payee-id', name: 'Market', transfer_acct: null }]);
    vi.mocked(api.createRule).mockResolvedValue(supportedRule());
    vi.mocked(api.sync).mockRejectedValueOnce(new Error('network failure'));
    await expect(client.createRule(draft)).rejects.toMatchObject({
      code: 'MUTATION_SYNC_FAILED', metadata: { partialState: true, recoveryAction: 'actual_sync' }
    });

    vi.mocked(api.sync).mockResolvedValue(undefined);
    vi.mocked(api.getRules).mockResolvedValue([]);
    await expect(client.createRule(draft)).rejects.toMatchObject({
      code: 'POST_MUTATION_READ_FAILED', metadata: { partialState: true }
    });
    await client.shutdown();
  });
});
