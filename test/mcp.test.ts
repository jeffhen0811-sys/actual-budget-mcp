import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/logger.js';
import { createMcpServer, TOOL_NAMES, type ToolRuntime } from '../src/mcp/server.js';

function fakeRuntime(): ToolRuntime {
  return {
    health: vi.fn().mockResolvedValue({ connected: true, server: 'http://actual.local:5006', budgetLoaded: true, version: '26.7.0' }),
    sync: vi.fn().mockResolvedValue({ success: true, synchronizedAt: '2026-08-29T12:00:00.000Z' }),
    listAccounts: vi.fn().mockResolvedValue([{ id: 'a1', name: 'Conta Corrente', offbudget: false, closed: false, balance: 1234 }]),
    getAccount: vi.fn().mockResolvedValue({ id: 'a1', name: 'Conta Corrente', offbudget: false, closed: false, balance: 1234 }),
    listCategories: vi.fn().mockResolvedValue([{ groupId: 'g1', groupName: 'Moradia', categories: [{ id: 'c1', name: 'Aluguel', hidden: false }] }]),
    listPayees: vi.fn().mockResolvedValue([{ id: 'p1', name: 'Padaria São João' }]),
    getTransactions: vi.fn().mockResolvedValue([{ id: 't1', account: 'a1', date: '2026-08-01', amount: -1500, notes: 'Café da manhã' }]),
    importTransactions: vi.fn().mockResolvedValue({ added: ['t1'], updated: [], errors: [] }),
    updateTransaction: vi.fn().mockResolvedValue({ success: true, transactionId: 't1' }),
    deleteTransaction: vi.fn().mockResolvedValue({ success: true, transactionId: 't1' })
  };
}

describe('MCP server contract', () => {
  let client: Client;
  let server: ReturnType<typeof createMcpServer>;
  let runtime: ToolRuntime;

  beforeEach(async () => {
    runtime = fakeRuntime();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createMcpServer(runtime, createLogger([], () => undefined));
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it('registers exactly ten tools with accurate annotations and English metadata', async () => {
    const { tools } = await client.listTools();
    expect(tools.map(tool => tool.name).sort()).toEqual([...TOOL_NAMES].sort());
    expect(tools).toHaveLength(10);
    for (const tool of tools) {
      expect(tool.title).toMatch(/^[\x20-\x7E]+$/);
      expect(tool.description).toMatch(/^[\x20-\x7E]+$/);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.outputSchema?.type).toBe('object');
      expect(tool.inputSchema.description).toEqual(expect.any(String));
      expect(tool.outputSchema?.description).toEqual(expect.any(String));
    }
    expect(tools.find(tool => tool.name === 'actual_list_accounts')?.annotations?.readOnlyHint).toBe(true);
    expect(tools.find(tool => tool.name === 'actual_sync')?.annotations).toMatchObject({ destructiveHint: false, idempotentHint: true });
    expect(tools.find(tool => tool.name === 'actual_delete_transaction')?.annotations?.destructiveHint).toBe(true);
    expect(tools.find(tool => tool.name === 'actual_delete_transaction')?.description).toContain('DESTRUCTIVE OPERATION');
  });

  it('returns matching JSON text and structured content while preserving user data verbatim', async () => {
    const result = await client.callTool({ name: 'actual_list_accounts', arguments: {} });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ accounts: [{ id: 'a1', name: 'Conta Corrente', offbudget: false, closed: false, balance: 1234 }] });
    expect(JSON.parse(result.content[0] && result.content[0].type === 'text' ? result.content[0].text : '')).toEqual(result.structuredContent);
  });

  it('executes every handler successfully with structured and JSON text results', async () => {
    const calls = [
      { name: 'actual_health', arguments: {} },
      { name: 'actual_sync', arguments: {} },
      { name: 'actual_list_accounts', arguments: {} },
      { name: 'actual_get_account', arguments: { accountId: 'a1' } },
      { name: 'actual_list_categories', arguments: {} },
      { name: 'actual_list_payees', arguments: {} },
      { name: 'actual_get_transactions', arguments: { accountId: 'a1', startDate: '2026-08-01', endDate: '2026-08-31' } },
      { name: 'actual_import_transactions', arguments: { accountId: 'a1', transactions: [{ date: '2026-08-29', amount: -1299, imported_id: 'provider:1' }] } },
      { name: 'actual_update_transaction', arguments: { transactionId: 't1', fields: { notes: 'Explicit note' } } },
      { name: 'actual_delete_transaction', arguments: { transactionId: 't1', confirmDestructive: true } }
    ];
    for (const call of calls) {
      const result = await client.callTool(call);
      expect(result.isError, call.name).not.toBe(true);
      expect(result.structuredContent, call.name).toBeDefined();
      expect(JSON.parse(result.content[0] && result.content[0].type === 'text' ? result.content[0].text : ''), call.name)
        .toEqual(result.structuredContent);
    }
  });

  it('rejects invalid dates, unknown fields, fractional amounts, oversized batches, and unconfirmed deletion before runtime calls', async () => {
    const invalidDate = await client.callTool({ name: 'actual_get_transactions', arguments: { accountId: 'a', startDate: '2026-02-30', endDate: '2026-03-01' } });
    const unknown = await client.callTool({ name: 'actual_get_account', arguments: { accountId: 'a', extra: true } });
    const fractional = await client.callTool({ name: 'actual_import_transactions', arguments: {
      accountId: 'a', transactions: [{ date: '2026-01-01', amount: 1.2, imported_id: 'id' }]
    } });
    const tooMany = await client.callTool({ name: 'actual_import_transactions', arguments: {
      accountId: 'a', transactions: Array.from({ length: 501 }, (_, index) => ({ date: '2026-01-01', amount: index, imported_id: String(index) }))
    } });
    const deletion = await client.callTool({ name: 'actual_delete_transaction', arguments: { transactionId: 't1', confirmDestructive: false } });
    expect([invalidDate, unknown, fractional, tooMany, deletion].every(result => result.isError === true)).toBe(true);
    expect(runtime.getTransactions).not.toHaveBeenCalled();
    expect(runtime.getAccount).not.toHaveBeenCalled();
    expect(runtime.importTransactions).not.toHaveBeenCalled();
    expect(runtime.deleteTransaction).not.toHaveBeenCalled();
  });

  it('passes only allowlisted update fields and requires at least one field', async () => {
    const empty = await client.callTool({ name: 'actual_update_transaction', arguments: { transactionId: 't1', fields: {} } });
    const unknown = await client.callTool({ name: 'actual_update_transaction', arguments: { transactionId: 't1', fields: { account: 'other' } } });
    const valid = await client.callTool({ name: 'actual_update_transaction', arguments: { transactionId: 't1', fields: { notes: 'Explicit note', amount: -100 } } });
    expect(empty.isError).toBe(true);
    expect(unknown.isError).toBe(true);
    expect(valid.isError).not.toBe(true);
    expect(runtime.updateTransaction).toHaveBeenCalledWith('t1', { notes: 'Explicit note', amount: -100 });
  });

  it('sanitizes unexpected tool failures and never exposes a credential sentinel', async () => {
    const sentinel = 'SENTINEL-PASSWORD-DO-NOT-LEAK';
    vi.mocked(runtime.sync).mockRejectedValue(new Error(`upstream password=${sentinel}`));
    const result = await client.callTool({ name: 'actual_sync', arguments: {} });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toContain(sentinel);
    expect(result.structuredContent).toMatchObject({ error: { code: 'INTERNAL_ERROR', operation: 'actual_sync' } });
  });
});
