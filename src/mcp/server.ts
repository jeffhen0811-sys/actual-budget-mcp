import { McpServer } from '@modelcontextprotocol/server';
import type { ActualClient } from '../actual/client.js';
import type { AdapterTransaction, ImportTransaction } from '../actual/adapter.js';
import type { Logger } from '../logger.js';
import {
  accountIdInputSchema,
  accountOutputSchema,
  accountsOutputSchema,
  categoriesOutputSchema,
  deleteTransactionInputSchema,
  emptyInputSchema,
  getTransactionsInputSchema,
  healthOutputSchema,
  importTransactionsInputSchema,
  importTransactionsOutputSchema,
  payeesOutputSchema,
  syncOutputSchema,
  transactionMutationOutputSchema,
  transactionsOutputSchema,
  updateTransactionInputSchema
} from './contracts.js';
import { successResult, toolError } from './response.js';

export interface ToolRuntime {
  health: ActualClient['health'];
  sync: ActualClient['sync'];
  listAccounts: ActualClient['listAccounts'];
  getAccount: ActualClient['getAccount'];
  listCategories: ActualClient['listCategories'];
  listPayees: ActualClient['listPayees'];
  getTransactions: ActualClient['getTransactions'];
  importTransactions: ActualClient['importTransactions'];
  updateTransaction: ActualClient['updateTransaction'];
  deleteTransaction: ActualClient['deleteTransaction'];
}

export const TOOL_NAMES = [
  'actual_health',
  'actual_list_accounts',
  'actual_get_account',
  'actual_list_categories',
  'actual_list_payees',
  'actual_get_transactions',
  'actual_import_transactions',
  'actual_update_transaction',
  'actual_delete_transaction',
  'actual_sync'
] as const;

export function createMcpServer(runtime: ToolRuntime, logger: Logger): McpServer {
  const server = new McpServer(
    { name: 'actual-budget-mcp', title: 'Actual Budget MCP', version: '0.1.0' },
    { instructions: 'Amounts are integer minor units. Use confirmDestructive=true only for an explicitly authorized deletion.' }
  );

  server.registerTool(
    'actual_health',
    {
      title: 'Check Actual health',
      description: 'Check Actual Server connectivity and local budget state without exposing credentials.',
      inputSchema: emptyInputSchema,
      outputSchema: healthOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult(await runtime.health()); } catch (error) { return toolError(error, 'actual_health', logger); }
    }
  );

  server.registerTool(
    'actual_sync',
    {
      title: 'Synchronize Actual budget',
      description: 'Synchronize the loaded local budget with Actual Server.',
      inputSchema: emptyInputSchema,
      outputSchema: syncOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult(await runtime.sync()); } catch (error) { return toolError(error, 'actual_sync', logger); }
    }
  );

  server.registerTool(
    'actual_list_accounts',
    {
      title: 'List Actual accounts',
      description: 'List every Actual account with its official ledger balance when available.',
      inputSchema: emptyInputSchema,
      outputSchema: accountsOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult({ accounts: await runtime.listAccounts() }); } catch (error) { return toolError(error, 'actual_list_accounts', logger); }
    }
  );

  server.registerTool(
    'actual_get_account',
    {
      title: 'Get Actual account',
      description: 'Get one Actual account by its opaque identifier, including its official ledger balance.',
      inputSchema: accountIdInputSchema,
      outputSchema: accountOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ accountId }) => {
      try { return successResult({ account: await runtime.getAccount(accountId) }); } catch (error) { return toolError(error, 'actual_get_account', logger); }
    }
  );

  server.registerTool(
    'actual_list_categories',
    {
      title: 'List Actual categories',
      description: 'List Actual category groups while preserving their nested categories.',
      inputSchema: emptyInputSchema,
      outputSchema: categoriesOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult({ categoryGroups: await runtime.listCategories() }); } catch (error) { return toolError(error, 'actual_list_categories', logger); }
    }
  );

  server.registerTool(
    'actual_list_payees',
    {
      title: 'List Actual payees',
      description: 'List every Actual payee with its opaque identifier and user-authored name.',
      inputSchema: emptyInputSchema,
      outputSchema: payeesOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult({ payees: await runtime.listPayees() }); } catch (error) { return toolError(error, 'actual_list_payees', logger); }
    }
  );

  server.registerTool(
    'actual_get_transactions',
    {
      title: 'Get Actual transactions',
      description: 'Get transactions for one account over an inclusive period of at most 366 days.',
      inputSchema: getTransactionsInputSchema,
      outputSchema: transactionsOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ accountId, startDate, endDate }) => {
      try { return successResult({ transactions: await runtime.getTransactions(accountId, startDate, endDate) }); } catch (error) { return toolError(error, 'actual_get_transactions', logger); }
    }
  );

  server.registerTool(
    'actual_import_transactions',
    {
      title: 'Import Actual transactions',
      description: 'Import up to 500 transactions idempotently using required opaque imported_id values.',
      inputSchema: importTransactionsInputSchema,
      outputSchema: importTransactionsOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ accountId, transactions }) => {
      try { return successResult(await runtime.importTransactions(accountId, transactions as Omit<ImportTransaction, 'account'>[])); } catch (error) { return toolError(error, 'actual_import_transactions', logger); }
    }
  );

  server.registerTool(
    'actual_update_transaction',
    {
      title: 'Update Actual transaction',
      description: 'Update only the permitted fields of one Actual transaction, then synchronize.',
      inputSchema: updateTransactionInputSchema,
      outputSchema: transactionMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async ({ transactionId, fields }) => {
      try { return successResult(await runtime.updateTransaction(transactionId, fields as Partial<AdapterTransaction>)); } catch (error) { return toolError(error, 'actual_update_transaction', logger); }
    }
  );

  server.registerTool(
    'actual_delete_transaction',
    {
      title: 'Delete Actual transaction',
      description: 'DESTRUCTIVE OPERATION: Permanently delete one Actual transaction only after explicit confirmation, then synchronize.',
      inputSchema: deleteTransactionInputSchema,
      outputSchema: transactionMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
    },
    async ({ transactionId }) => {
      try { return successResult(await runtime.deleteTransaction(transactionId)); } catch (error) { return toolError(error, 'actual_delete_transaction', logger); }
    }
  );

  return server;
}
