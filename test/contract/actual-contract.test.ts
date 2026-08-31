import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActualClient } from '../../src/actual/client.js';
import type { ActualConfig } from '../../src/config.js';
import {
  accountSchema,
  administeredPayeeSchema,
  administeredCategoryGroupSchema,
  administeredCategorySchema,
  categoryGroupSchema,
  ruleSchema,
  transactionSchema,
  transactionsOutputSchema
} from '../../src/mcp/contracts.js';
import { fakeAdapter } from '../helpers.js';
import { matchesTemporaryTestPayee } from '../real/ownership.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

describe('Actual data contracts observed through @actual-app/api', () => {
  it('accepts Actual payee title-casing only when imported_payee remains the exact test sentinel', () => {
    expect(matchesTemporaryTestPayee('Mcp Integration Test', 'MCP INTEGRATION TEST')).toBe(true);
    expect(matchesTemporaryTestPayee('Mcp Integration Test', 'different-imported-payee')).toBe(false);
    expect(matchesTemporaryTestPayee('Different Payee', 'MCP INTEGRATION TEST')).toBe(false);
  });

  it('accepts manual, imported, starting-balance, absent, and explicitly null transaction fields', () => {
    const base = { id: 'transaction-id', account: 'account-id', date: '2026-08-20', amount: -123 };

    expect(transactionSchema.parse({
      ...base,
      payee: null,
      category: null,
      notes: null,
      imported_id: null,
      imported_payee: null,
      transfer_id: null,
      cleared: true,
      reconciled: false,
      starting_balance_flag: true
    })).toMatchObject({ imported_id: null, notes: null, starting_balance_flag: true });

    expect(transactionSchema.parse({
      ...base,
      id: 'imported-transaction-id',
      imported_id: 'mcp-integration-test:fixture',
      imported_payee: 'MCP INTEGRATION TEST',
      notes: 'MCP INTEGRATION TEST TEMPORARY'
    })).toMatchObject({ imported_id: 'mcp-integration-test:fixture' });

    expect(transactionSchema.parse(base)).toEqual(base);
  });

  it('requires integer minor-unit amounts and rejects invented nullability on required fields', () => {
    expect(() => transactionSchema.parse({ id: 't', account: 'a', date: '2026-08-20', amount: 1.5 })).toThrow('integer');
    expect(() => transactionSchema.parse({ id: 't', account: null, date: '2026-08-20', amount: 1 })).toThrow();
    expect(() => transactionSchema.parse({ id: 't', account: 'a', date: null, amount: 1 })).toThrow();
  });

  it('accepts normalized closed/off-budget accounts and nested category hidden flags', () => {
    expect(accountSchema.parse({ id: 'a', name: 'Closed test account', offbudget: true, closed: true })).toMatchObject({
      offbudget: true,
      closed: true
    });
    expect(categoryGroupSchema.parse({
      groupId: 'g',
      groupName: 'Group',
      categories: [{ id: 'c', name: 'Hidden category', hidden: true }]
    }).categories[0]?.hidden).toBe(true);
  });

  it('accepts complete structural shapes and rejects fabricated defaults for absent SDK fields', async () => {
    expect(administeredCategoryGroupSchema.parse({ id: 'g', name: 'Income', isIncome: true, hidden: false })).toEqual({
      id: 'g', name: 'Income', isIncome: true, hidden: false
    });
    expect(administeredCategorySchema.parse({ id: 'c', name: 'Salary', groupId: 'g', isIncome: true, hidden: false })).toEqual({
      id: 'c', name: 'Salary', groupId: 'g', isIncome: true, hidden: false
    });
    const dataDir = await mkdtemp(join(tmpdir(), 'actual-contract-optional-'));
    directories.push(dataDir);
    const api = fakeAdapter();
    vi.mocked(api.getCategoryGroups).mockResolvedValue([{ id: 'g', name: 'Incomplete' }]);
    const client = new ActualClient(api, async () => ({
      serverUrl: 'http://actual.example:5006', password: 'contract-only-sentinel', syncId: 'budget', dataDir
    }));
    try {
      await expect(client.updateCategoryGroup('g', 'Renamed')).rejects.toMatchObject({ code: 'PREFLIGHT_INCONCLUSIVE' });
      expect(api.updateCategoryGroup).not.toHaveBeenCalled();
    } finally {
      await client.shutdown();
    }
  });

  it('pins ordinary and transfer payees plus representative installed rule shapes', () => {
    expect(administeredPayeeSchema.parse({ id: 'ordinary', name: 'Market', transferAccountId: null })).toMatchObject({ transferAccountId: null });
    expect(administeredPayeeSchema.parse({ id: 'transfer', name: 'Checking', transferAccountId: 'account' })).toMatchObject({ transferAccountId: 'account' });
    const fixtures = [
      {
        id: 'pre', stage: 'pre', conditionsOp: 'and', writable: true,
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'market', type: 'string' }],
        actions: [{ op: 'set', field: 'payee', value: 'payee', type: 'id' }]
      },
      {
        id: 'default', stage: 'default', conditionsOp: 'or', writable: true,
        conditions: [{ field: 'payee', op: 'oneOf', value: ['payee-a', 'payee-b'], type: 'id', options: null }],
        actions: [{ op: 'append-notes', field: 'notes', value: 'reviewed', type: 'id' }]
      },
      {
        id: 'post', stage: 'post', conditionsOp: 'and', writable: false,
        conditions: [{ field: 'amount', op: 'isbetween', value: { num1: -2000, num2: -1000 }, type: 'number', options: { outflow: true } }],
        actions: [
          { op: 'set', field: 'amount', value: 100, type: 'number', options: { formula: '=amount' } },
          { op: 'set-split-amount', field: null, value: null, type: 'number', options: { method: 'remainder', splitIndex: 1 } }
        ],
        writeRestriction: 'Advanced rule.'
      }
    ];
    for (const rule of fixtures) expect(() => ruleSchema.parse(rule)).not.toThrow();
  });

  it('passes real-shape nullable SDK records through the production mapper and output schema', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'actual-contract-'));
    directories.push(dataDir);
    const config: ActualConfig = {
      serverUrl: 'http://actual.example:5006',
      password: 'contract-only-sentinel',
      syncId: 'budget',
      dataDir
    };
    const api = fakeAdapter();
    vi.mocked(api.getTransactions).mockResolvedValue([
      {
        id: 'starting-balance',
        account: 'account-id',
        date: '2026-08-17',
        amount: 250000,
        payee: 'payee-id',
        category: 'category-id',
        notes: null,
        imported_id: null,
        imported_payee: null,
        transfer_id: null,
        cleared: true,
        reconciled: false,
        starting_balance_flag: true
      },
      {
        id: 'imported',
        account: 'account-id',
        date: '2026-08-30',
        amount: -123,
        imported_id: 'mcp-integration-test:fixture',
        imported_payee: 'MCP INTEGRATION TEST'
      }
    ]);
    const client = new ActualClient(api, async () => config);

    try {
      const transactions = await client.getTransactions('account-id', '2026-08-01', '2026-08-31');
      expect(() => transactionsOutputSchema.parse({ transactions })).not.toThrow();
      expect(transactions[0]).toMatchObject({ notes: null, imported_id: null, transfer_id: null });
      expect(transactions[1]).toMatchObject({ imported_id: 'mcp-integration-test:fixture' });
    } finally {
      await client.shutdown();
    }
  });
});
