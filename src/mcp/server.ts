import { McpServer, type StandardSchemaWithJSON, type ToolCallback } from '@modelcontextprotocol/server';
import type { ActualClient } from '../actual/client.js';
import type { AdapterTransaction, ImportTransaction } from '../actual/adapter.js';
import type { WritableRuleDraft } from '../actual/rules.js';
import type { ScheduleDraft, ScheduleUpdate } from '../actual/schedules.js';
import type { SummaryScope } from '../actual/summaries.js';
import type { OperationalConfig } from '../config.js';
import { loadOperationalConfig } from '../config.js';
import { MCP_VERSION } from '../version.js';
import type { Logger } from '../logger.js';
import { PublicError } from '../errors.js';
import { successResult, toolError } from './response.js';
import { annotationsFor, enforceToolPolicy, TOOL_CAPABILITIES, TOOL_DEFINITIONS, TOOL_NAMES as REGISTERED_TOOL_NAMES, type ToolDefinition, type ToolName } from './tool-registry.js';

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
  listSchedules: ActualClient['listSchedules'];
  getSchedule: ActualClient['getSchedule'];
  createSchedule: ActualClient['createSchedule'];
  updateSchedule: ActualClient['updateSchedule'];
  deleteSchedule: ActualClient['deleteSchedule'];
  getMonthSummary: ActualClient['getMonthSummary'];
  getSpendingSummary: ActualClient['getSpendingSummary'];
  getIncomeSummary: ActualClient['getIncomeSummary'];
  runtimeStatus: ActualClient['runtimeStatus'];
  getOperationalPolicy?: ActualClient['getOperationalPolicy'];
}

export const TOOL_NAMES = REGISTERED_TOOL_NAMES;

export function createMcpServer(runtime: ToolRuntime, logger: Logger, configuredPolicy?: OperationalConfig): McpServer {
  const policy = configuredPolicy ?? runtime.getOperationalPolicy?.() ?? loadOperationalConfig();
  const server = new McpServer(
    { name: 'actual-budget-mcp', title: 'Actual Budget MCP', version: MCP_VERSION },
    { instructions: 'Amounts are signed integer minor units. Transaction bulk update and budget copy default to dry runs. Use write confirmations only after explicit authorization.' }
  );

  const definitionFor = <Name extends ToolName>(name: Name) => {
    const definition = TOOL_CAPABILITIES.get(name);
    if (!definition) throw new Error(`Tool ${name} is missing from the authoritative registry.`);
    return definition as Extract<(typeof TOOL_DEFINITIONS)[number], { name: Name }>;
  };
  const registerTool = <Input extends StandardSchemaWithJSON, Output extends StandardSchemaWithJSON>(
    definition: ToolDefinition<string, Input, Output>,
    handler: ToolCallback<Input>
  ) => {
    const guardedHandler = (async (...args: unknown[]) => {
      try { enforceToolPolicy(definition, policy); }
      catch (error) { return toolError(error, definition.name, logger); }
      const input = args[0] as Record<string, unknown> | undefined;
      if (definition.confirmation === 'confirm-destructive' && input?.confirmDestructive !== true) {
        const entity = (() => {
          if (!input) return undefined;
          const mappings = {
            actual_delete_transaction: ['transaction', 'transactionId'],
            actual_delete_account: ['account', 'accountId'],
            actual_delete_category_group: ['categoryGroup', 'groupId'],
            actual_delete_category: ['category', 'categoryId'],
            actual_delete_payee: ['payee', 'payeeId'],
            actual_merge_payees: ['payee', 'targetPayeeId'],
            actual_delete_rule: ['rule', 'ruleId'],
            actual_delete_schedule: ['schedule', 'scheduleId']
          } as const;
          const mapping = mappings[definition.name as keyof typeof mappings];
          if (!mapping || typeof input[mapping[1]] !== 'string') return undefined;
          return { type: mapping[0], id: input[mapping[1]] as string };
        })();
        return toolError(new PublicError(
          'DESTRUCTIVE_CONFIRMATION_REQUIRED',
          `Set confirmDestructive to true only after explicitly authorizing ${definition.name}.`,
          definition.name,
          false,
          entity ? { entity } : undefined
        ), definition.name, logger);
      }
      return (handler as (...handlerArgs: unknown[]) => unknown)(...args);
    }) as ToolCallback<Input>;
    return server.registerTool<Output, Input>(definition.name, {
      title: definition.title,
      description: definition.description,
      inputSchema: definition.inputSchema,
      outputSchema: definition.outputSchema,
      annotations: annotationsFor(definition)
    }, guardedHandler);
  };

  registerTool(
    definitionFor('actual_health'),
    async () => {
      try { return successResult(await runtime.health()); } catch (error) { return toolError(error, 'actual_health', logger); }
    }
  );

  registerTool(
    definitionFor('actual_sync'),
    async () => {
      try { return successResult(await runtime.sync()); } catch (error) { return toolError(error, 'actual_sync', logger); }
    }
  );

  registerTool(
    definitionFor('actual_list_budget_months'),
    async () => {
      try { return successResult(await runtime.listBudgetMonths()); }
      catch (error) { return toolError(error, 'actual_list_budget_months', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_budget_month'),
    async ({ month }) => {
      try { return successResult(await runtime.getBudgetMonth(month)); }
      catch (error) { return toolError(error, 'actual_get_budget_month', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_budget_summary'),
    async ({ month, groupId, categoryId, limit }) => {
      try { return successResult(await runtime.getBudgetSummary(month, {
        ...(groupId === undefined ? {} : { groupId }),
        ...(categoryId === undefined ? {} : { categoryId }),
        limit
      })); }
      catch (error) { return toolError(error, 'actual_get_budget_summary', logger); }
    }
  );

  registerTool(
    definitionFor('actual_set_budget_amount'),
    async ({ month, categoryId, amount }) => {
      try { return successResult(await runtime.setBudgetAmount(month, categoryId, amount)); }
      catch (error) { return toolError(error, 'actual_set_budget_amount', logger); }
    }
  );

  registerTool(
    definitionFor('actual_set_budget_carryover'),
    async ({ month, categoryId, carryover }) => {
      try { return successResult(await runtime.setBudgetCarryover(month, categoryId, carryover)); }
      catch (error) { return toolError(error, 'actual_set_budget_carryover', logger); }
    }
  );

  registerTool(
    definitionFor('actual_hold_budget_for_next_month'),
    async ({ month, amount }) => {
      try { return successResult(await runtime.holdBudgetForNextMonth(month, amount)); }
      catch (error) { return toolError(error, 'actual_hold_budget_for_next_month', logger); }
    }
  );

  registerTool(
    definitionFor('actual_reset_budget_hold'),
    async ({ month }) => {
      try { return successResult(await runtime.resetBudgetHold(month)); }
      catch (error) { return toolError(error, 'actual_reset_budget_hold', logger); }
    }
  );

  registerTool(
    definitionFor('actual_copy_budget_month'),
    async ({ sourceMonth, targetMonth, ...options }) => {
      try { return successResult(await runtime.copyBudgetMonth(sourceMonth, targetMonth, options)); }
      catch (error) { return toolError(error, 'actual_copy_budget_month', logger); }
    }
  );

  registerTool(
    definitionFor('actual_list_accounts'),
    async () => {
      try { return successResult({ accounts: await runtime.listAccounts() }); } catch (error) { return toolError(error, 'actual_list_accounts', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_account'),
    async ({ accountId }) => {
      try { return successResult({ account: await runtime.getAccount(accountId) }); } catch (error) { return toolError(error, 'actual_get_account', logger); }
    }
  );

  registerTool(
    definitionFor('actual_list_categories'),
    async () => {
      try { return successResult({ categoryGroups: await runtime.listCategories() }); } catch (error) { return toolError(error, 'actual_list_categories', logger); }
    }
  );

  registerTool(
    definitionFor('actual_list_payees'),
    async () => {
      try { return successResult({ payees: await runtime.listPayees() }); } catch (error) { return toolError(error, 'actual_list_payees', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_transactions'),
    async ({ accountId, startDate, endDate }) => {
      try { return successResult({ transactions: await runtime.getTransactions(accountId, startDate, endDate) }); } catch (error) { return toolError(error, 'actual_get_transactions', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_transaction'),
    async ({ transactionId }) => {
      try { return successResult({ transaction: await runtime.getTransaction(transactionId) }); }
      catch (error) { return toolError(error, 'actual_get_transaction', logger); }
    }
  );

  registerTool(
    definitionFor('actual_search_transactions'),
    async input => {
      try { return successResult(await runtime.searchTransactions(input as Parameters<ToolRuntime['searchTransactions']>[0])); }
      catch (error) { return toolError(error, 'actual_search_transactions', logger); }
    }
  );

  registerTool(
    definitionFor('actual_preview_import'),
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

  registerTool(
    definitionFor('actual_bulk_update_transactions'),
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

  registerTool(
    definitionFor('actual_import_transactions'),
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

  registerTool(
    definitionFor('actual_update_transaction'),
    async ({ transactionId, fields }) => {
      try { return successResult(await runtime.updateTransaction(transactionId, fields as Partial<AdapterTransaction>)); } catch (error) { return toolError(error, 'actual_update_transaction', logger); }
    }
  );

  registerTool(
    definitionFor('actual_delete_transaction'),
    async ({ transactionId }) => {
      try { return successResult(await runtime.deleteTransaction(transactionId)); } catch (error) { return toolError(error, 'actual_delete_transaction', logger); }
    }
  );

  registerTool(
    definitionFor('actual_list_transfer_payees'),
    async () => {
      try { return successResult({ transferPayees: await runtime.listTransferPayees() }); }
      catch (error) { return toolError(error, 'actual_list_transfer_payees', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_transfer'),
    async ({ transactionId }) => {
      try { return successResult(await runtime.getTransfer(transactionId)); }
      catch (error) { return toolError(error, 'actual_get_transfer', logger); }
    }
  );

  registerTool(
    definitionFor('actual_search_transfers'),
    async input => {
      try { return successResult(await runtime.searchTransfers(input as Parameters<ToolRuntime['searchTransfers']>[0])); }
      catch (error) { return toolError(error, 'actual_search_transfers', logger); }
    }
  );

  registerTool(
    definitionFor('actual_create_transfer'),
    async input => {
      try { return successResult(await runtime.createTransfer(input as Parameters<ToolRuntime['createTransfer']>[0])); }
      catch (error) { return toolError(error, 'actual_create_transfer', logger); }
    }
  );

  registerTool(
    definitionFor('actual_find_possible_transfers'),
    async input => {
      try { return successResult(await runtime.findPossibleTransfers(input as Parameters<ToolRuntime['findPossibleTransfers']>[0])); }
      catch (error) { return toolError(error, 'actual_find_possible_transfers', logger); }
    }
  );

  registerTool(
    definitionFor('actual_find_possible_duplicates'),
    async input => {
      try { return successResult(await runtime.findPossibleDuplicates(input as Parameters<ToolRuntime['findPossibleDuplicates']>[0])); }
      catch (error) { return toolError(error, 'actual_find_possible_duplicates', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_account_reconciliation'),
    async ({ accountId, cutoff, statementBalance }) => {
      try { return successResult(await runtime.getAccountReconciliation(accountId, cutoff, statementBalance)); }
      catch (error) { return toolError(error, 'actual_get_account_reconciliation', logger); }
    }
  );

  registerTool(
    definitionFor('actual_create_account'),
    async ({ name, offbudget, initialBalance }) => {
      try { return successResult(await runtime.createAccount(name, offbudget, initialBalance)); }
      catch (error) { return toolError(error, 'actual_create_account', logger); }
    }
  );

  registerTool(
    definitionFor('actual_update_account'),
    async ({ accountId, name, offbudget }) => {
      try { return successResult(await runtime.updateAccount(accountId, { ...(name === undefined ? {} : { name }), ...(offbudget === undefined ? {} : { offbudget }) })); }
      catch (error) { return toolError(error, 'actual_update_account', logger); }
    }
  );

  registerTool(
    definitionFor('actual_close_account'),
    async ({ accountId, transferAccountId, transferCategoryId }) => {
      try { return successResult(await runtime.closeAccount(accountId, transferAccountId, transferCategoryId)); }
      catch (error) { return toolError(error, 'actual_close_account', logger); }
    }
  );

  registerTool(
    definitionFor('actual_reopen_account'),
    async ({ accountId }) => {
      try { return successResult(await runtime.reopenAccount(accountId)); }
      catch (error) { return toolError(error, 'actual_reopen_account', logger); }
    }
  );

  registerTool(
    definitionFor('actual_delete_account'),
    async ({ accountId }) => {
      try { return successResult(await runtime.deleteAccount(accountId)); }
      catch (error) { return toolError(error, 'actual_delete_account', logger); }
    }
  );

  registerTool(
    definitionFor('actual_create_category_group'),
    async ({ name, isIncome }) => {
      try { return successResult(await runtime.createCategoryGroup(name, isIncome)); }
      catch (error) { return toolError(error, 'actual_create_category_group', logger); }
    }
  );

  registerTool(
    definitionFor('actual_update_category_group'),
    async ({ groupId, name }) => {
      try { return successResult(await runtime.updateCategoryGroup(groupId, name)); }
      catch (error) { return toolError(error, 'actual_update_category_group', logger); }
    }
  );

  registerTool(
    definitionFor('actual_delete_category_group'),
    async ({ groupId }) => {
      try { return successResult(await runtime.deleteCategoryGroup(groupId)); }
      catch (error) { return toolError(error, 'actual_delete_category_group', logger); }
    }
  );

  registerTool(
    definitionFor('actual_create_category'),
    async ({ name, groupId }) => {
      try { return successResult(await runtime.createCategory(name, groupId)); }
      catch (error) { return toolError(error, 'actual_create_category', logger); }
    }
  );

  registerTool(
    definitionFor('actual_update_category'),
    async ({ categoryId, name }) => {
      try { return successResult(await runtime.updateCategory(categoryId, name)); }
      catch (error) { return toolError(error, 'actual_update_category', logger); }
    }
  );

  registerTool(
    definitionFor('actual_move_category'),
    async ({ categoryId, targetGroupId }) => {
      try { return successResult(await runtime.moveCategory(categoryId, targetGroupId)); }
      catch (error) { return toolError(error, 'actual_move_category', logger); }
    }
  );

  registerTool(
    definitionFor('actual_hide_category'),
    async ({ categoryId }) => {
      try { return successResult(await runtime.hideCategory(categoryId)); }
      catch (error) { return toolError(error, 'actual_hide_category', logger); }
    }
  );

  registerTool(
    definitionFor('actual_unhide_category'),
    async ({ categoryId }) => {
      try { return successResult(await runtime.unhideCategory(categoryId)); }
      catch (error) { return toolError(error, 'actual_unhide_category', logger); }
    }
  );

  registerTool(
    definitionFor('actual_delete_category'),
    async ({ categoryId }) => {
      try { return successResult(await runtime.deleteCategory(categoryId)); }
      catch (error) { return toolError(error, 'actual_delete_category', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_payee'),
    async ({ payeeId }) => {
      try { return successResult({ payee: await runtime.getPayee(payeeId) }); }
      catch (error) { return toolError(error, 'actual_get_payee', logger); }
    }
  );

  registerTool(
    definitionFor('actual_create_payee'),
    async ({ name }) => {
      try { return successResult(await runtime.createPayee(name)); }
      catch (error) { return toolError(error, 'actual_create_payee', logger); }
    }
  );

  registerTool(
    definitionFor('actual_update_payee'),
    async ({ payeeId, name }) => {
      try { return successResult(await runtime.updatePayee(payeeId, name)); }
      catch (error) { return toolError(error, 'actual_update_payee', logger); }
    }
  );

  registerTool(
    definitionFor('actual_delete_payee'),
    async ({ payeeId, confirmDestructive }) => {
      try { return successResult(await runtime.deletePayee(payeeId, confirmDestructive)); }
      catch (error) { return toolError(error, 'actual_delete_payee', logger); }
    }
  );

  registerTool(
    definitionFor('actual_merge_payees'),
    async ({ sourcePayeeIds, targetPayeeId, confirmDestructive }) => {
      try { return successResult(await runtime.mergePayees(sourcePayeeIds, targetPayeeId, confirmDestructive)); }
      catch (error) { return toolError(error, 'actual_merge_payees', logger); }
    }
  );

  registerTool(
    definitionFor('actual_list_rules'),
    async () => {
      try { return successResult({ rules: await runtime.listRules() }); }
      catch (error) { return toolError(error, 'actual_list_rules', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_rule'),
    async ({ ruleId }) => {
      try { return successResult({ rule: await runtime.getRule(ruleId) }); }
      catch (error) { return toolError(error, 'actual_get_rule', logger); }
    }
  );

  registerTool(
    definitionFor('actual_create_rule'),
    async input => {
      try { return successResult(await runtime.createRule(input as WritableRuleDraft)); }
      catch (error) { return toolError(error, 'actual_create_rule', logger); }
    }
  );

  registerTool(
    definitionFor('actual_update_rule'),
    async ({ ruleId, ...fields }) => {
      try { return successResult(await runtime.updateRule(ruleId, fields as Parameters<ToolRuntime['updateRule']>[1])); }
      catch (error) { return toolError(error, 'actual_update_rule', logger); }
    }
  );

  registerTool(
    definitionFor('actual_delete_rule'),
    async ({ ruleId, confirmDestructive }) => {
      try { return successResult(await runtime.deleteRule(ruleId, confirmDestructive)); }
      catch (error) { return toolError(error, 'actual_delete_rule', logger); }
    }
  );

  registerTool(
    definitionFor('actual_list_schedules'),
    async input => {
      try { return successResult(await runtime.listSchedules(input as Parameters<ToolRuntime['listSchedules']>[0])); }
      catch (error) { return toolError(error, 'actual_list_schedules', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_schedule'),
    async ({ scheduleId }) => {
      try { return successResult(await runtime.getSchedule(scheduleId)); }
      catch (error) { return toolError(error, 'actual_get_schedule', logger); }
    }
  );

  registerTool(
    definitionFor('actual_create_schedule'),
    async input => {
      try { return successResult(await runtime.createSchedule(input as ScheduleDraft)); }
      catch (error) { return toolError(error, 'actual_create_schedule', logger); }
    }
  );

  registerTool(
    definitionFor('actual_update_schedule'),
    async ({ scheduleId, ...fields }) => {
      try { return successResult(await runtime.updateSchedule(scheduleId, fields as ScheduleUpdate)); }
      catch (error) { return toolError(error, 'actual_update_schedule', logger); }
    }
  );

  registerTool(
    definitionFor('actual_delete_schedule'),
    async ({ scheduleId, confirmDestructive }) => {
      try { return successResult(await runtime.deleteSchedule(scheduleId, confirmDestructive)); }
      catch (error) { return toolError(error, 'actual_delete_schedule', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_month_summary'),
    async ({ month, ...scope }) => {
      try { return successResult(await runtime.getMonthSummary(month, scope as Omit<SummaryScope, 'startDate' | 'endDate'>)); }
      catch (error) { return toolError(error, 'actual_get_month_summary', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_spending_summary'),
    async input => {
      try { return successResult(await runtime.getSpendingSummary(input as SummaryScope)); }
      catch (error) { return toolError(error, 'actual_get_spending_summary', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_income_summary'),
    async input => {
      try { return successResult(await runtime.getIncomeSummary(input as SummaryScope)); }
      catch (error) { return toolError(error, 'actual_get_income_summary', logger); }
    }
  );

  registerTool(
    definitionFor('actual_get_runtime_status'),
    async () => {
      try { return successResult(await runtime.runtimeStatus()); }
      catch (error) { return toolError(error, 'actual_get_runtime_status', logger); }
    }
  );

  return server;
}
