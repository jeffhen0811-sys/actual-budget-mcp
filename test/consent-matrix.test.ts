import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdapterBudgetMonth } from '../src/actual/adapter.js';
import { ActualClient } from '../src/actual/client.js';
import { createLogger } from '../src/logger.js';
import { bulkUpdateTransactionsInputSchema, copyBudgetInputSchema, createTransferInputSchema } from '../src/mcp/contracts.js';
import { createMcpServer, type ToolRuntime } from '../src/mcp/server.js';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';
import { fakeAdapter } from './helpers.js';
import { SAFE_MUTATION_ARGUMENTS } from './fixtures/safe-tool-arguments-v1.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

async function actualClient() {
  const dataDir = await mkdtemp(join(tmpdir(), 'actual-consent-matrix-'));
  directories.push(dataDir);
  const api = fakeAdapter();
  const client = new ActualClient(api, async () => ({
    serverUrl: 'http://actual.example:5006', password: 'consent-test-secret', syncId: 'budget', dataDir
  }));
  return { api, client };
}

function budgetMonth(month: string, budgeted: number): AdapterBudgetMonth {
  return {
    month, incomeAvailable: 0, lastMonthOverspent: 0, forNextMonth: 0, totalBudgeted: budgeted,
    toBudget: 0, fromLastMonth: 0, totalIncome: 0, totalSpent: 0, totalBalance: budgeted,
    categoryGroups: [{
      id: 'group-id', name: 'Group', is_income: false, hidden: false, budgeted, spent: 0, balance: budgeted,
      categories: [{
        id: 'category-id', name: 'Category', group_id: 'group-id', is_income: false, hidden: false,
        budgeted, spent: 0, balance: budgeted, carryover: false
      }]
    }]
  };
}

describe('global per-call consent matrix', () => {
  it('rejects absent and false confirmation for every delete and payee merge before runtime', async () => {
    const invoked: string[] = [];
    const runtime = new Proxy({}, { get: (_target, property) => async () => {
      invoked.push(String(property));
      throw new Error('Unconfirmed destructive handler executed.');
    } }) as ToolRuntime;
    const server = createMcpServer(runtime, createLogger([], () => undefined), {
      readOnly: false, allowDestructive: true
    });
    const client = new Client({ name: 'consent-matrix', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const structural = TOOL_DEFINITIONS.filter(item => item.confirmation === 'confirm-destructive');
      expect(structural).toHaveLength(8);
      for (const definition of structural) {
        const confirmed = SAFE_MUTATION_ARGUMENTS[definition.name]!;
        const { confirmDestructive: _confirmation, ...absent } = confirmed;
        for (const arguments_ of [absent, { ...absent, confirmDestructive: false }]) {
          const result = await client.callTool({ name: definition.name, arguments: arguments_ });
          expect(result.structuredContent, definition.name).toMatchObject({
            error: { code: 'DESTRUCTIVE_CONFIRMATION_REQUIRED', operation: definition.name, retryable: false }
          });
        }
      }
      expect(invoked).toEqual([]);
    } finally {
      await Promise.all([client.close(), server.close()]);
    }
  });

  it('defaults bulk and transfer to previews and refuses unconfirmed execution before domain reads', async () => {
    expect(bulkUpdateTransactionsInputSchema.parse(SAFE_MUTATION_ARGUMENTS.actual_bulk_update_transactions)).toMatchObject({ dryRun: true });
    expect(createTransferInputSchema.parse(SAFE_MUTATION_ARGUMENTS.actual_create_transfer)).toMatchObject({ dryRun: true });
    const { api, client } = await actualClient();
    try {
      await expect(client.bulkUpdateTransactions([
        { transactionId: 'transaction-id', fields: { cleared: true } }
      ], { dryRun: false })).rejects.toMatchObject({ code: 'WRITE_CONFIRMATION_REQUIRED' });
      await expect(client.createTransfer({
        fromAccountId: 'from', toAccountId: 'to', amount: 1, date: '2026-09-01', dryRun: false
      })).rejects.toMatchObject({ code: 'WRITE_CONFIRMATION_REQUIRED' });
      expect(api.aqlQuery).not.toHaveBeenCalled();
      expect(api.getAccounts).not.toHaveBeenCalled();
    } finally {
      await client.shutdown();
    }
  });

  it('allows fill-empty execution without overwrite consent and protects nonzero overwrite', async () => {
    expect(copyBudgetInputSchema.parse({ sourceMonth: '2026-08', targetMonth: '2026-09' })).toMatchObject({
      dryRun: true, mode: 'fill-empty', confirmOverwrite: false
    });
    const { api, client } = await actualClient();
    const months: Record<string, AdapterBudgetMonth> = {
      '2026-08': budgetMonth('2026-08', 100),
      '2026-09': budgetMonth('2026-09', 0)
    };
    vi.mocked(api.getBudgetMonths).mockResolvedValue(Object.keys(months));
    vi.mocked(api.getBudgetMonth).mockImplementation(async month => structuredClone(months[month]!));
    vi.mocked(api.setBudgetAmount).mockImplementation(async (month, _categoryId, amount) => {
      const category = months[month]!.categoryGroups[0]!.categories![0]!;
      category.budgeted = amount;
      months[month]!.categoryGroups[0]!.budgeted = amount;
    });
    try {
      await expect(client.copyBudgetMonth('2026-08', '2026-09', { dryRun: false, mode: 'fill-empty' }))
        .resolves.toMatchObject({ executed: true, synchronized: true, verified: true });
      months['2026-09']!.categoryGroups[0]!.categories![0]!.budgeted = 50;
      months['2026-09']!.categoryGroups[0]!.budgeted = 50;
      vi.mocked(api.setBudgetAmount).mockClear();
      await expect(client.copyBudgetMonth('2026-08', '2026-09', { dryRun: false, mode: 'overwrite' }))
        .rejects.toMatchObject({ code: 'OVERWRITE_CONFIRMATION_REQUIRED' });
      expect(api.setBudgetAmount).not.toHaveBeenCalled();
      await expect(client.copyBudgetMonth('2026-08', '2026-09', {
        dryRun: false, mode: 'overwrite', confirmOverwrite: true
      })).resolves.toMatchObject({ executed: true, synchronized: true, verified: true });
    } finally {
      await client.shutdown();
    }
  });
});
