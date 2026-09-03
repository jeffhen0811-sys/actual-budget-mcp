import { McpServer, type StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import type { ActualClient } from '../actual/client.js';
import type { AdapterTransaction, ImportTransaction } from '../actual/adapter.js';
import type { WritableRuleDraft } from '../actual/rules.js';
import type { Logger } from '../logger.js';
import {
  accountIdInputSchema,
  accountReconciliationInputSchema,
  accountReconciliationOutputSchema,
  accountDeletionOutputSchema,
  accountMutationOutputSchema,
  accountOutputSchema,
  accountsOutputSchema,
  budgetAmountMutationOutputSchema,
  budgetCarryoverMutationOutputSchema,
  budgetCopyOutputSchema,
  budgetHoldOutputSchema,
  budgetMonthInputSchema,
  budgetMonthOutputSchema,
  budgetResetHoldOutputSchema,
  budgetSummaryInputSchema,
  budgetSummaryOutputSchema,
  categoryDeletionOutputSchema,
  categoryGroupDeletionOutputSchema,
  categoryGroupMutationOutputSchema,
  categoryIdInputSchema,
  categoryMutationOutputSchema,
  categoriesOutputSchema,
  closeAccountInputSchema,
  createAccountInputSchema,
  createCategoryGroupInputSchema,
  createCategoryInputSchema,
  createPayeeInputSchema,
  createRuleInputSchema,
  createTransferInputSchema,
  createTransferOutputSchema,
  copyBudgetInputSchema,
  deleteAccountInputSchema,
  deleteCategoryGroupInputSchema,
  deleteCategoryInputSchema,
  deletePayeeInputSchema,
  deleteRuleInputSchema,
  deleteTransactionInputSchema,
  emptyInputSchema,
  findPossibleDuplicatesInputSchema,
  findPossibleDuplicatesOutputSchema,
  findPossibleTransfersInputSchema,
  findPossibleTransfersOutputSchema,
  getTransactionsInputSchema,
  getTransferInputSchema,
  getTransferOutputSchema,
  healthOutputSchema,
  importTransactionsInputSchema,
  importTransactionsOutputSchema,
  getTransactionInputSchema,
  transactionOutputSchema,
  searchTransactionsInputSchema,
  searchTransactionsOutputSchema,
  searchTransfersInputSchema,
  searchTransfersOutputSchema,
  previewImportInputSchema,
  previewImportOutputSchema,
  bulkUpdateTransactionsInputSchema,
  bulkUpdateTransactionsOutputSchema,
  holdBudgetInputSchema,
  listBudgetMonthsOutputSchema,
  mergePayeesInputSchema,
  moveCategoryInputSchema,
  payeesOutputSchema,
  payeeDeletionOutputSchema,
  payeeIdInputSchema,
  payeeMergeOutputSchema,
  payeeMutationOutputSchema,
  payeeOutputSchema,
  ruleDeletionOutputSchema,
  ruleIdInputSchema,
  ruleMutationOutputSchema,
  ruleOutputSchema,
  rulesOutputSchema,
  syncOutputSchema,
  setBudgetAmountInputSchema,
  setBudgetCarryoverInputSchema,
  transactionMutationOutputSchema,
  transactionsOutputSchema,
  transferPayeesOutputSchema,
  updateAccountInputSchema,
  updateCategoryGroupInputSchema,
  updateCategoryInputSchema,
  updatePayeeInputSchema,
  updateRuleInputSchema,
  updateTransactionInputSchema
} from './contracts.js';
import { PublicError } from '../errors.js';
import { successResult, toolError } from './response.js';

export interface ToolRuntime {
  health: ActualClient['health'];
  sync: ActualClient['sync'];
  listAccounts: ActualClient['listAccounts'];
  getAccount: ActualClient['getAccount'];
  listCategories: ActualClient['listCategories'];
  listPayees: ActualClient['listPayees'];
  listTransferPayees: ActualClient['listTransferPayees'];
  getTransactions: ActualClient['getTransactions'];
  getTransaction: ActualClient['getTransaction'];
  searchTransactions: ActualClient['searchTransactions'];
  getTransfer: ActualClient['getTransfer'];
  searchTransfers: ActualClient['searchTransfers'];
  createTransfer: ActualClient['createTransfer'];
  findPossibleTransfers: ActualClient['findPossibleTransfers'];
  findPossibleDuplicates: ActualClient['findPossibleDuplicates'];
  getAccountReconciliation: ActualClient['getAccountReconciliation'];
  previewImport: ActualClient['previewImport'];
  bulkUpdateTransactions: ActualClient['bulkUpdateTransactions'];
  importTransactions: ActualClient['importTransactions'];
  updateTransaction: ActualClient['updateTransaction'];
  deleteTransaction: ActualClient['deleteTransaction'];
  createAccount: ActualClient['createAccount'];
  updateAccount: ActualClient['updateAccount'];
  closeAccount: ActualClient['closeAccount'];
  reopenAccount: ActualClient['reopenAccount'];
  deleteAccount: ActualClient['deleteAccount'];
  createCategoryGroup: ActualClient['createCategoryGroup'];
  updateCategoryGroup: ActualClient['updateCategoryGroup'];
  deleteCategoryGroup: ActualClient['deleteCategoryGroup'];
  createCategory: ActualClient['createCategory'];
  updateCategory: ActualClient['updateCategory'];
  moveCategory: ActualClient['moveCategory'];
  hideCategory: ActualClient['hideCategory'];
  unhideCategory: ActualClient['unhideCategory'];
  deleteCategory: ActualClient['deleteCategory'];
  getPayee: ActualClient['getPayee'];
  createPayee: ActualClient['createPayee'];
  updatePayee: ActualClient['updatePayee'];
  deletePayee: ActualClient['deletePayee'];
  mergePayees: ActualClient['mergePayees'];
  listRules: ActualClient['listRules'];
  getRule: ActualClient['getRule'];
  createRule: ActualClient['createRule'];
  updateRule: ActualClient['updateRule'];
  deleteRule: ActualClient['deleteRule'];
  listBudgetMonths: ActualClient['listBudgetMonths'];
  getBudgetMonth: ActualClient['getBudgetMonth'];
  getBudgetSummary: ActualClient['getBudgetSummary'];
  setBudgetAmount: ActualClient['setBudgetAmount'];
  setBudgetCarryover: ActualClient['setBudgetCarryover'];
  holdBudgetForNextMonth: ActualClient['holdBudgetForNextMonth'];
  resetBudgetHold: ActualClient['resetBudgetHold'];
  copyBudgetMonth: ActualClient['copyBudgetMonth'];
}

export const V040_TOOL_NAMES = [
  'actual_health',
  'actual_list_accounts',
  'actual_get_account',
  'actual_list_categories',
  'actual_list_payees',
  'actual_get_transactions',
  'actual_import_transactions',
  'actual_update_transaction',
  'actual_delete_transaction',
  'actual_sync',
  'actual_create_account',
  'actual_update_account',
  'actual_close_account',
  'actual_reopen_account',
  'actual_delete_account',
  'actual_create_category_group',
  'actual_update_category_group',
  'actual_delete_category_group',
  'actual_create_category',
  'actual_update_category',
  'actual_move_category',
  'actual_hide_category',
  'actual_unhide_category',
  'actual_delete_category',
  'actual_get_payee',
  'actual_create_payee',
  'actual_update_payee',
  'actual_delete_payee',
  'actual_merge_payees',
  'actual_list_rules',
  'actual_get_rule',
  'actual_create_rule',
  'actual_update_rule',
  'actual_delete_rule',
  'actual_list_budget_months',
  'actual_get_budget_month',
  'actual_get_budget_summary',
  'actual_set_budget_amount',
  'actual_set_budget_carryover',
  'actual_hold_budget_for_next_month',
  'actual_reset_budget_hold',
  'actual_copy_budget_month'
] as const;

export const TOOL_NAMES = [
  ...V040_TOOL_NAMES,
  'actual_get_transaction',
  'actual_search_transactions',
  'actual_bulk_update_transactions',
  'actual_preview_import',
  'actual_list_transfer_payees',
  'actual_get_transfer',
  'actual_search_transfers',
  'actual_create_transfer',
  'actual_find_possible_transfers',
  'actual_find_possible_duplicates',
  'actual_get_account_reconciliation'
] as const;

function acceptUnconfirmedForStructuredError<T extends StandardSchemaWithJSON>(schema: T): T {
  const standard = schema['~standard'];
  type ValidateValue = Parameters<typeof standard.validate>[0];
  type ValidateOptions = Parameters<typeof standard.validate>[1];
  return {
    '~standard': {
      ...standard,
      validate: async (value: ValidateValue, options: ValidateOptions) => {
        if (value && typeof value === 'object' && !Array.isArray(value) &&
            (!Object.hasOwn(value, 'confirmDestructive') || (value as Record<string, unknown>).confirmDestructive === false)) {
          const result = await standard.validate({ ...value, confirmDestructive: true }, options);
          if (result.issues) return result;
          return { value: { ...(result.value as Record<string, unknown>), confirmDestructive: false } };
        }
        return standard.validate(value, options);
      }
    }
  } as unknown as T;
}

const deleteAccountToolInputSchema = acceptUnconfirmedForStructuredError(deleteAccountInputSchema);
const deleteCategoryGroupToolInputSchema = acceptUnconfirmedForStructuredError(deleteCategoryGroupInputSchema);
const deleteCategoryToolInputSchema = acceptUnconfirmedForStructuredError(deleteCategoryInputSchema);
const deletePayeeToolInputSchema = acceptUnconfirmedForStructuredError(deletePayeeInputSchema);
const mergePayeesToolInputSchema = acceptUnconfirmedForStructuredError(mergePayeesInputSchema);
const deleteRuleToolInputSchema = acceptUnconfirmedForStructuredError(deleteRuleInputSchema);

export function createMcpServer(runtime: ToolRuntime, logger: Logger): McpServer {
  const server = new McpServer(
    { name: 'actual-budget-mcp', title: 'Actual Budget MCP', version: '0.6.0' },
    { instructions: 'Amounts are signed integer minor units. Transaction bulk update and budget copy default to dry runs. Use write confirmations only after explicit authorization.' }
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
    'actual_list_budget_months',
    {
      title: 'List available budget months',
      description: 'List the chronological months available for official budget queries; availability does not imply configured planning.',
      inputSchema: emptyInputSchema,
      outputSchema: listBudgetMonthsOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult(await runtime.listBudgetMonths()); }
      catch (error) { return toolError(error, 'actual_list_budget_months', logger); }
    }
  );

  server.registerTool(
    'actual_get_budget_month',
    {
      title: 'Get monthly budget',
      description: 'Read official signed month aggregates and runtime-validated envelope or tracking category shapes.',
      inputSchema: budgetMonthInputSchema,
      outputSchema: budgetMonthOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ month }) => {
      try { return successResult(await runtime.getBudgetMonth(month)); }
      catch (error) { return toolError(error, 'actual_get_budget_month', logger); }
    }
  );

  server.registerTool(
    'actual_get_budget_summary',
    {
      title: 'Summarize monthly budget',
      description: 'Return official signed month aggregates with bounded optional category-group and category detail.',
      inputSchema: budgetSummaryInputSchema,
      outputSchema: budgetSummaryOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ month, groupId, categoryId, limit }) => {
      try { return successResult(await runtime.getBudgetSummary(month, {
        ...(groupId === undefined ? {} : { groupId }),
        ...(categoryId === undefined ? {} : { categoryId }),
        limit
      })); }
      catch (error) { return toolError(error, 'actual_get_budget_summary', logger); }
    }
  );

  server.registerTool(
    'actual_set_budget_amount',
    {
      title: 'Set category budget amount',
      description: 'Set and verify a desired signed category planning amount; zero clears the planned amount.',
      inputSchema: setBudgetAmountInputSchema,
      outputSchema: budgetAmountMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ month, categoryId, amount }) => {
      try { return successResult(await runtime.setBudgetAmount(month, categoryId, amount)); }
      catch (error) { return toolError(error, 'actual_set_budget_amount', logger); }
    }
  );

  server.registerTool(
    'actual_set_budget_carryover',
    {
      title: 'Set expense budget carryover',
      description: 'Set and verify expense-category carryover prospectively from the selected month through later available months.',
      inputSchema: setBudgetCarryoverInputSchema,
      outputSchema: budgetCarryoverMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ month, categoryId, carryover }) => {
      try { return successResult(await runtime.setBudgetCarryover(month, categoryId, carryover)); }
      catch (error) { return toolError(error, 'actual_set_budget_carryover', logger); }
    }
  );

  server.registerTool(
    'actual_hold_budget_for_next_month',
    {
      title: 'Hold budget funds for next month',
      description: 'Incrementally hold a positive amount in an envelope budget and report the official applied result and observed aggregate.',
      inputSchema: holdBudgetInputSchema,
      outputSchema: budgetHoldOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async ({ month, amount }) => {
      try { return successResult(await runtime.holdBudgetForNextMonth(month, amount)); }
      catch (error) { return toolError(error, 'actual_hold_budget_for_next_month', logger); }
    }
  );

  server.registerTool(
    'actual_reset_budget_hold',
    {
      title: 'Reset manual budget hold',
      description: 'Reset only the manual envelope hold and report observed forNextMonth aggregates without attributing automatic holds.',
      inputSchema: budgetMonthInputSchema,
      outputSchema: budgetResetHoldOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ month }) => {
      try { return successResult(await runtime.resetBudgetHold(month)); }
      catch (error) { return toolError(error, 'actual_reset_budget_hold', logger); }
    }
  );

  server.registerTool(
    'actual_copy_budget_month',
    {
      title: 'Preview or copy monthly planning',
      description: 'Preview by default or sequentially copy bounded category planning with hidden opt-in and confirmed nonzero overwrite protection.',
      inputSchema: copyBudgetInputSchema,
      outputSchema: budgetCopyOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true }
    },
    async ({ sourceMonth, targetMonth, ...options }) => {
      try { return successResult(await runtime.copyBudgetMonth(sourceMonth, targetMonth, options)); }
      catch (error) { return toolError(error, 'actual_copy_budget_month', logger); }
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
    'actual_get_transaction',
    {
      title: 'Get exact Actual transaction',
      description: 'Get one exact transaction by opaque ID, preserving transfer, starting-balance, and split identity.',
      inputSchema: getTransactionInputSchema,
      outputSchema: transactionOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ transactionId }) => {
      try { return successResult({ transaction: await runtime.getTransaction(transactionId) }); }
      catch (error) { return toolError(error, 'actual_get_transaction', logger); }
    }
  );

  server.registerTool(
    'actual_search_transactions',
    {
      title: 'Search Actual transactions',
      description: 'Search transactions across accounts with typed filters, signed amounts, split-aware deterministic pagination, and optional totals.',
      inputSchema: searchTransactionsInputSchema,
      outputSchema: searchTransactionsOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async input => {
      try { return successResult(await runtime.searchTransactions(input as Parameters<ToolRuntime['searchTransactions']>[0])); }
      catch (error) { return toolError(error, 'actual_search_transactions', logger); }
    }
  );

  server.registerTool(
    'actual_preview_import',
    {
      title: 'Preview Actual transaction import',
      description: 'Run the official reconciliation pipeline in read-only dry-run mode and return truthful preview evidence plus a request fingerprint.',
      inputSchema: previewImportInputSchema,
      outputSchema: previewImportOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ accountId, transactions, defaultCleared, reimportDeleted }) => {
      try {
        return successResult(await runtime.previewImport(
          accountId,
          transactions as Omit<ImportTransaction, 'account'>[],
          {
            ...(defaultCleared === undefined ? {} : { defaultCleared }),
            ...(reimportDeleted === undefined ? {} : { reimportDeleted })
          }
        ));
      } catch (error) { return toolError(error, 'actual_preview_import', logger); }
    }
  );

  server.registerTool(
    'actual_bulk_update_transactions',
    {
      title: 'Bulk update Actual transactions safely',
      description: 'Plan up to 100 heterogeneous desired-state updates in dry-run mode by default; execution requires dryRun false and confirmWrite true.',
      inputSchema: bulkUpdateTransactionsInputSchema,
      outputSchema: bulkUpdateTransactionsOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ items, dryRun, confirmWrite }) => {
      try {
        return successResult(await runtime.bulkUpdateTransactions(
          items as Parameters<ToolRuntime['bulkUpdateTransactions']>[0],
          {
            ...(dryRun === undefined ? {} : { dryRun }),
            ...(confirmWrite === undefined ? {} : { confirmWrite })
          }
        ));
      } catch (error) { return toolError(error, 'actual_bulk_update_transactions', logger); }
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
    async ({ accountId, transactions, defaultCleared, reimportDeleted, expectedPreviewFingerprint }) => {
      try {
        return successResult(await runtime.importTransactions(
          accountId,
          transactions as Omit<ImportTransaction, 'account'>[],
          {
            ...(defaultCleared === undefined ? {} : { defaultCleared }),
            ...(reimportDeleted === undefined ? {} : { reimportDeleted })
          },
          expectedPreviewFingerprint
        ));
      } catch (error) { return toolError(error, 'actual_import_transactions', logger); }
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

  server.registerTool(
    'actual_list_transfer_payees',
    {
      title: 'List Actual transfer payees',
      description: 'List official transfer payees with exact destination account metadata.',
      inputSchema: emptyInputSchema,
      outputSchema: transferPayeesOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult({ transferPayees: await runtime.listTransferPayees() }); }
      catch (error) { return toolError(error, 'actual_list_transfer_payees', logger); }
    }
  );

  server.registerTool(
    'actual_get_transfer',
    {
      title: 'Get exact Actual transfer',
      description: 'Inspect one reciprocal transfer pair by either exact transaction ID and return integrity evidence.',
      inputSchema: getTransferInputSchema,
      outputSchema: getTransferOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ transactionId }) => {
      try { return successResult(await runtime.getTransfer(transactionId)); }
      catch (error) { return toolError(error, 'actual_get_transfer', logger); }
    }
  );

  server.registerTool(
    'actual_search_transfers',
    {
      title: 'Search Actual transfers',
      description: 'Search bounded reciprocal transfer evidence with integrity filters and deterministic pagination.',
      inputSchema: searchTransfersInputSchema,
      outputSchema: searchTransfersOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async input => {
      try { return successResult(await runtime.searchTransfers(input as Parameters<ToolRuntime['searchTransfers']>[0])); }
      catch (error) { return toolError(error, 'actual_search_transfers', logger); }
    }
  );

  server.registerTool(
    'actual_create_transfer',
    {
      title: 'Preview or create an Actual transfer',
      description: 'Preview by default; creation requires dryRun false and confirmWrite true and is non-idempotent.',
      inputSchema: createTransferInputSchema,
      outputSchema: createTransferOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async input => {
      try { return successResult(await runtime.createTransfer(input as Parameters<ToolRuntime['createTransfer']>[0])); }
      catch (error) { return toolError(error, 'actual_create_transfer', logger); }
    }
  );

  server.registerTool(
    'actual_find_possible_transfers',
    {
      title: 'Find possible unlinked Actual transfers',
      description: 'Classify bounded opposite-amount cross-account candidates without linking or mutation.',
      inputSchema: findPossibleTransfersInputSchema,
      outputSchema: findPossibleTransfersOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async input => {
      try { return successResult(await runtime.findPossibleTransfers(input as Parameters<ToolRuntime['findPossibleTransfers']>[0])); }
      catch (error) { return toolError(error, 'actual_find_possible_transfers', logger); }
    }
  );

  server.registerTool(
    'actual_find_possible_duplicates',
    {
      title: 'Find possible duplicate Actual transactions',
      description: 'Classify bounded same-account duplicate candidates without merge, deletion, or mutation.',
      inputSchema: findPossibleDuplicatesInputSchema,
      outputSchema: findPossibleDuplicatesOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async input => {
      try { return successResult(await runtime.findPossibleDuplicates(input as Parameters<ToolRuntime['findPossibleDuplicates']>[0])); }
      catch (error) { return toolError(error, 'actual_find_possible_duplicates', logger); }
    }
  );

  server.registerTool(
    'actual_get_account_reconciliation',
    {
      title: 'Get Actual account reconciliation diagnostics',
      description: 'Compute a read-only split-safe cutoff snapshot with optional signed statement differences.',
      inputSchema: accountReconciliationInputSchema,
      outputSchema: accountReconciliationOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ accountId, cutoff, statementBalance }) => {
      try { return successResult(await runtime.getAccountReconciliation(accountId, cutoff, statementBalance)); }
      catch (error) { return toolError(error, 'actual_get_account_reconciliation', logger); }
    }
  );

  server.registerTool(
    'actual_create_account',
    {
      title: 'Create Actual account',
      description: 'Create an Actual account with an optional signed integer opening balance, then synchronize and verify it.',
      inputSchema: createAccountInputSchema,
      outputSchema: accountMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async ({ name, offbudget, initialBalance }) => {
      try { return successResult(await runtime.createAccount(name, offbudget, initialBalance)); }
      catch (error) { return toolError(error, 'actual_create_account', logger); }
    }
  );

  server.registerTool(
    'actual_update_account',
    {
      title: 'Update Actual account',
      description: 'Update only the name and/or off-budget state of an Actual account, then verify the persisted state.',
      inputSchema: updateAccountInputSchema,
      outputSchema: accountMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ accountId, name, offbudget }) => {
      try { return successResult(await runtime.updateAccount(accountId, { ...(name === undefined ? {} : { name }), ...(offbudget === undefined ? {} : { offbudget }) })); }
      catch (error) { return toolError(error, 'actual_update_account', logger); }
    }
  );

  server.registerTool(
    'actual_close_account',
    {
      title: 'Safely close Actual account',
      description: 'Safely close a non-empty Actual account after complete history and balance-transfer preflight.',
      inputSchema: closeAccountInputSchema,
      outputSchema: accountMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ accountId, transferAccountId, transferCategoryId }) => {
      try { return successResult(await runtime.closeAccount(accountId, transferAccountId, transferCategoryId)); }
      catch (error) { return toolError(error, 'actual_close_account', logger); }
    }
  );

  server.registerTool(
    'actual_reopen_account',
    {
      title: 'Reopen Actual account',
      description: 'Reopen a closed Actual account, synchronize, and verify the desired state.',
      inputSchema: accountIdInputSchema,
      outputSchema: accountMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ accountId }) => {
      try { return successResult(await runtime.reopenAccount(accountId)); }
      catch (error) { return toolError(error, 'actual_reopen_account', logger); }
    }
  );

  server.registerTool(
    'actual_delete_account',
    {
      title: 'Delete empty Actual account',
      description: 'DESTRUCTIVE OPERATION: Permanently delete an account only after literal confirmation and complete history proves it is empty.',
      inputSchema: deleteAccountToolInputSchema,
      outputSchema: accountDeletionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
    },
    async ({ accountId, confirmDestructive }) => {
      if (!confirmDestructive) return toolError(new PublicError(
        'DESTRUCTIVE_CONFIRMATION_REQUIRED',
        'Set confirmDestructive to true only after explicitly authorizing this account deletion.',
        'actual_delete_account',
        false,
        { entity: { type: 'account', id: accountId } }
      ), 'actual_delete_account', logger);
      try { return successResult(await runtime.deleteAccount(accountId)); }
      catch (error) { return toolError(error, 'actual_delete_account', logger); }
    }
  );

  server.registerTool(
    'actual_create_category_group',
    {
      title: 'Create Actual category group',
      description: 'Create a visible expense or income category group, synchronize, and verify it.',
      inputSchema: createCategoryGroupInputSchema,
      outputSchema: categoryGroupMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async ({ name, isIncome }) => {
      try { return successResult(await runtime.createCategoryGroup(name, isIncome)); }
      catch (error) { return toolError(error, 'actual_create_category_group', logger); }
    }
  );

  server.registerTool(
    'actual_update_category_group',
    {
      title: 'Rename Actual category group',
      description: 'Rename an Actual category group without changing its type or visibility.',
      inputSchema: updateCategoryGroupInputSchema,
      outputSchema: categoryGroupMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ groupId, name }) => {
      try { return successResult(await runtime.updateCategoryGroup(groupId, name)); }
      catch (error) { return toolError(error, 'actual_update_category_group', logger); }
    }
  );

  server.registerTool(
    'actual_delete_category_group',
    {
      title: 'Delete empty Actual category group',
      description: 'DESTRUCTIVE OPERATION: Permanently delete a category group only after literal confirmation and a complete read proves it has no categories.',
      inputSchema: deleteCategoryGroupToolInputSchema,
      outputSchema: categoryGroupDeletionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
    },
    async ({ groupId, confirmDestructive }) => {
      if (!confirmDestructive) return toolError(new PublicError(
        'DESTRUCTIVE_CONFIRMATION_REQUIRED',
        'Set confirmDestructive to true only after explicitly authorizing this category-group deletion.',
        'actual_delete_category_group',
        false,
        { entity: { type: 'categoryGroup', id: groupId } }
      ), 'actual_delete_category_group', logger);
      try { return successResult(await runtime.deleteCategoryGroup(groupId)); }
      catch (error) { return toolError(error, 'actual_delete_category_group', logger); }
    }
  );

  server.registerTool(
    'actual_create_category',
    {
      title: 'Create Actual category',
      description: 'Create a visible category whose income or expense type is derived from its persisted group.',
      inputSchema: createCategoryInputSchema,
      outputSchema: categoryMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async ({ name, groupId }) => {
      try { return successResult(await runtime.createCategory(name, groupId)); }
      catch (error) { return toolError(error, 'actual_create_category', logger); }
    }
  );

  server.registerTool(
    'actual_update_category',
    {
      title: 'Rename Actual category',
      description: 'Rename an Actual category without changing its group, type, or visibility.',
      inputSchema: updateCategoryInputSchema,
      outputSchema: categoryMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ categoryId, name }) => {
      try { return successResult(await runtime.updateCategory(categoryId, name)); }
      catch (error) { return toolError(error, 'actual_update_category', logger); }
    }
  );

  server.registerTool(
    'actual_move_category',
    {
      title: 'Move Actual category',
      description: 'Move a category to another group only when both persisted income or expense types match.',
      inputSchema: moveCategoryInputSchema,
      outputSchema: categoryMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ categoryId, targetGroupId }) => {
      try { return successResult(await runtime.moveCategory(categoryId, targetGroupId)); }
      catch (error) { return toolError(error, 'actual_move_category', logger); }
    }
  );

  server.registerTool(
    'actual_hide_category',
    {
      title: 'Hide Actual category',
      description: 'Set an Actual category to hidden and verify the persisted desired state.',
      inputSchema: categoryIdInputSchema,
      outputSchema: categoryMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ categoryId }) => {
      try { return successResult(await runtime.hideCategory(categoryId)); }
      catch (error) { return toolError(error, 'actual_hide_category', logger); }
    }
  );

  server.registerTool(
    'actual_unhide_category',
    {
      title: 'Unhide Actual category',
      description: 'Set an Actual category to visible and verify the persisted desired state.',
      inputSchema: categoryIdInputSchema,
      outputSchema: categoryMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ categoryId }) => {
      try { return successResult(await runtime.unhideCategory(categoryId)); }
      catch (error) { return toolError(error, 'actual_unhide_category', logger); }
    }
  );

  server.registerTool(
    'actual_delete_category',
    {
      title: 'Delete unused Actual category',
      description: 'DESTRUCTIVE OPERATION: Permanently delete a category only after literal confirmation and complete transaction and budget scans prove it is unused.',
      inputSchema: deleteCategoryToolInputSchema,
      outputSchema: categoryDeletionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
    },
    async ({ categoryId, confirmDestructive }) => {
      if (!confirmDestructive) return toolError(new PublicError(
        'DESTRUCTIVE_CONFIRMATION_REQUIRED',
        'Set confirmDestructive to true only after explicitly authorizing this category deletion.',
        'actual_delete_category',
        false,
        { entity: { type: 'category', id: categoryId } }
      ), 'actual_delete_category', logger);
      try { return successResult(await runtime.deleteCategory(categoryId)); }
      catch (error) { return toolError(error, 'actual_delete_category', logger); }
    }
  );

  server.registerTool(
    'actual_get_payee',
    {
      title: 'Get Actual payee',
      description: 'Get one Actual payee and its official transfer-account relationship when present.',
      inputSchema: payeeIdInputSchema,
      outputSchema: payeeOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ payeeId }) => {
      try { return successResult({ payee: await runtime.getPayee(payeeId) }); }
      catch (error) { return toolError(error, 'actual_get_payee', logger); }
    }
  );

  server.registerTool(
    'actual_create_payee',
    {
      title: 'Create Actual payee',
      description: 'Create an ordinary payee or return the single exact existing ordinary payee, then verify persisted state.',
      inputSchema: createPayeeInputSchema,
      outputSchema: payeeMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ name }) => {
      try { return successResult(await runtime.createPayee(name)); }
      catch (error) { return toolError(error, 'actual_create_payee', logger); }
    }
  );

  server.registerTool(
    'actual_update_payee',
    {
      title: 'Rename Actual payee',
      description: 'Rename one ordinary payee to the desired trimmed name; transfer payees are protected.',
      inputSchema: updatePayeeInputSchema,
      outputSchema: payeeMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ payeeId, name }) => {
      try { return successResult(await runtime.updatePayee(payeeId, name)); }
      catch (error) { return toolError(error, 'actual_update_payee', logger); }
    }
  );

  server.registerTool(
    'actual_delete_payee',
    {
      title: 'Delete unused Actual payee',
      description: 'DESTRUCTIVE OPERATION: Preflight all transaction and rule references, then delete one proven-unused ordinary payee only with literal confirmation.',
      inputSchema: deletePayeeToolInputSchema,
      outputSchema: payeeDeletionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
    },
    async ({ payeeId, confirmDestructive }) => {
      try { return successResult(await runtime.deletePayee(payeeId, confirmDestructive)); }
      catch (error) { return toolError(error, 'actual_delete_payee', logger); }
    }
  );

  server.registerTool(
    'actual_merge_payees',
    {
      title: 'Merge Actual payees',
      description: 'DESTRUCTIVE OPERATION: Preflight and merge ordinary source payees into one distinct ordinary target only with literal confirmation.',
      inputSchema: mergePayeesToolInputSchema,
      outputSchema: payeeMergeOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
    },
    async ({ sourcePayeeIds, targetPayeeId, confirmDestructive }) => {
      try { return successResult(await runtime.mergePayees(sourcePayeeIds, targetPayeeId, confirmDestructive)); }
      catch (error) { return toolError(error, 'actual_merge_payees', logger); }
    }
  );

  server.registerTool(
    'actual_list_rules',
    {
      title: 'List Actual rules',
      description: 'List every Actual rule in official execution order with complete pinned semantics and MCP writability.',
      inputSchema: emptyInputSchema,
      outputSchema: rulesOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult({ rules: await runtime.listRules() }); }
      catch (error) { return toolError(error, 'actual_list_rules', logger); }
    }
  );

  server.registerTool(
    'actual_get_rule',
    {
      title: 'Get Actual rule',
      description: 'Get one Actual rule by stable opaque identifier with complete pinned semantics and MCP writability.',
      inputSchema: ruleIdInputSchema,
      outputSchema: ruleOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ ruleId }) => {
      try { return successResult({ rule: await runtime.getRule(ruleId) }); }
      catch (error) { return toolError(error, 'actual_get_rule', logger); }
    }
  );

  server.registerTool(
    'actual_create_rule',
    {
      title: 'Create Actual rule',
      description: 'Create one supported non-destructive Actual rule after validating every referenced entity.',
      inputSchema: createRuleInputSchema,
      outputSchema: ruleMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async input => {
      try { return successResult(await runtime.createRule(input as WritableRuleDraft)); }
      catch (error) { return toolError(error, 'actual_create_rule', logger); }
    }
  );

  server.registerTool(
    'actual_update_rule',
    {
      title: 'Update Actual rule',
      description: 'Apply allowlisted desired-state changes to one MCP-writable rule using the official full-object update.',
      inputSchema: updateRuleInputSchema,
      outputSchema: ruleMutationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ ruleId, ...fields }) => {
      try { return successResult(await runtime.updateRule(ruleId, fields as Parameters<ToolRuntime['updateRule']>[1])); }
      catch (error) { return toolError(error, 'actual_update_rule', logger); }
    }
  );

  server.registerTool(
    'actual_delete_rule',
    {
      title: 'Delete Actual rule',
      description: 'DESTRUCTIVE OPERATION: Delete one identified rule only with literal confirmation and respect Actual-protected rules.',
      inputSchema: deleteRuleToolInputSchema,
      outputSchema: ruleDeletionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
    },
    async ({ ruleId, confirmDestructive }) => {
      try { return successResult(await runtime.deleteRule(ruleId, confirmDestructive)); }
      catch (error) { return toolError(error, 'actual_delete_rule', logger); }
    }
  );

  return server;
}
