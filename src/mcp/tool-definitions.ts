import type { StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import * as contracts from './contracts.js';
import type { OperationalConfig } from '../config.js';
import {
  MAX_BULK_TRANSACTION_UPDATES,
  MAX_DATE_RANGE_DAYS,
  MAX_IMPORT_BATCH,
  type PublicLimitName
} from '../schemas.js';
import { PublicError } from '../errors.js';

export type ToolCapability = 'read' | 'write' | 'destructive';
export type ToolDomain = 'runtime' | 'accounts' | 'categories' | 'payees' | 'rules' | 'transactions' | 'import' | 'budget' | 'transfers' | 'reconciliation' | 'schedules' | 'summaries';
export type ConfirmationModel = 'none' | 'confirm-destructive' | 'confirm-write' | 'budget-copy';
export type SynchronizationPolicy = 'none' | 'sync-only' | 'write-and-sync' | 'write-without-sync';
export type PartialFailureClassification = 'none' | 'sync-failure' | 'sync-after-write' | 'multi-step';

export interface ToolDefinition<Name extends string = string, Input extends StandardSchemaWithJSON = StandardSchemaWithJSON, Output extends StandardSchemaWithJSON = StandardSchemaWithJSON> {
  name: Name;
  domain: ToolDomain;
  capability: ToolCapability;
  idempotent: boolean;
  title: string;
  description: string;
  inputSchema: Input;
  outputSchema: Output;
  confirmation: ConfirmationModel;
  bounds: readonly PublicLimitName[];
  synchronization: SynchronizationPolicy;
  partialFailure: PartialFailureClassification;
}

function defineTool<Name extends string, Input extends StandardSchemaWithJSON, Output extends StandardSchemaWithJSON>(definition: ToolDefinition<Name, Input, Output>): ToolDefinition<Name, Input, Output> {
  return definition;
}

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

const deleteAccountToolInputSchema = acceptUnconfirmedForStructuredError(contracts.deleteAccountInputSchema);
const deleteCategoryGroupToolInputSchema = acceptUnconfirmedForStructuredError(contracts.deleteCategoryGroupInputSchema);
const deleteCategoryToolInputSchema = acceptUnconfirmedForStructuredError(contracts.deleteCategoryInputSchema);
const deletePayeeToolInputSchema = acceptUnconfirmedForStructuredError(contracts.deletePayeeInputSchema);
const mergePayeesToolInputSchema = acceptUnconfirmedForStructuredError(contracts.mergePayeesInputSchema);
const deleteRuleToolInputSchema = acceptUnconfirmedForStructuredError(contracts.deleteRuleInputSchema);
const deleteScheduleToolInputSchema = acceptUnconfirmedForStructuredError(contracts.deleteScheduleInputSchema);
const deleteTransactionToolInputSchema = acceptUnconfirmedForStructuredError(contracts.deleteTransactionInputSchema);

/** Authoritative public contract, capability policy, and operation semantics for all MCP tools. */
export const TOOL_DEFINITIONS = [
  defineTool({
    name: "actual_health", domain: "runtime", capability: "read", idempotent: true,
    title: "Check Actual health",
    description: "Check Actual Server connectivity and local budget state without exposing credentials.",
    inputSchema: contracts.emptyInputSchema, outputSchema: contracts.healthOutputSchema,
    confirmation: "none", bounds: [],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_sync", domain: "runtime", capability: "write", idempotent: true,
    title: "Synchronize Actual budget",
    description: "Synchronize the loaded local budget with Actual Server.",
    inputSchema: contracts.emptyInputSchema, outputSchema: contracts.syncOutputSchema,
    confirmation: "none", bounds: [],
    synchronization: "sync-only", partialFailure: "sync-failure"
  }),
  defineTool({
    name: "actual_list_budget_months", domain: "budget", capability: "read", idempotent: true,
    title: "List available budget months",
    description: "List the chronological months available for official budget queries; availability does not imply configured planning.",
    inputSchema: contracts.emptyInputSchema, outputSchema: contracts.listBudgetMonthsOutputSchema,
    confirmation: "none", bounds: [],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_get_budget_month", domain: "budget", capability: "read", idempotent: true,
    title: "Get monthly budget",
    description: "Read official signed month aggregates and runtime-validated envelope or tracking category shapes.",
    inputSchema: contracts.budgetMonthInputSchema, outputSchema: contracts.budgetMonthOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_get_budget_summary", domain: "budget", capability: "read", idempotent: true,
    title: "Summarize monthly budget",
    description: "Return official signed month aggregates with bounded optional category-group and category detail.",
    inputSchema: contracts.budgetSummaryInputSchema, outputSchema: contracts.budgetSummaryOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH","MAX_DATE_RANGE_DAYS","MAX_TOP_PAYEE_RESULTS","MAX_BUDGET_CATEGORY_RESULTS"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_set_budget_amount", domain: "budget", capability: "write", idempotent: true,
    title: "Set category budget amount",
    description: "Set and verify a desired signed category planning amount; zero clears the planned amount.",
    inputSchema: contracts.setBudgetAmountInputSchema, outputSchema: contracts.budgetAmountMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_set_budget_carryover", domain: "budget", capability: "write", idempotent: true,
    title: "Set expense budget carryover",
    description: "Set and verify expense-category carryover prospectively from the selected month through later available months.",
    inputSchema: contracts.setBudgetCarryoverInputSchema, outputSchema: contracts.budgetCarryoverMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_hold_budget_for_next_month", domain: "budget", capability: "write", idempotent: false,
    title: "Hold budget funds for next month",
    description: "Incrementally hold a positive amount in an envelope budget and report the official applied result and observed aggregate.",
    inputSchema: contracts.holdBudgetInputSchema, outputSchema: contracts.budgetHoldOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_reset_budget_hold", domain: "budget", capability: "write", idempotent: true,
    title: "Reset manual budget hold",
    description: "Reset only the manual envelope hold and report observed forNextMonth aggregates without attributing automatic holds.",
    inputSchema: contracts.budgetMonthInputSchema, outputSchema: contracts.budgetResetHoldOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_copy_budget_month", domain: "budget", capability: "destructive", idempotent: true,
    title: "Preview or copy monthly planning",
    description: "Preview by default or sequentially copy bounded category planning with hidden opt-in and confirmed nonzero overwrite protection.",
    inputSchema: contracts.copyBudgetInputSchema, outputSchema: contracts.budgetCopyOutputSchema,
    confirmation: "budget-copy", bounds: ["MAX_BUDGET_COPY_DIFFERENCE_RESULTS","MAX_BUDGET_COPY_CHANGES"],
    synchronization: "write-and-sync", partialFailure: "multi-step"
  }),
  defineTool({
    name: "actual_list_accounts", domain: "accounts", capability: "read", idempotent: true,
    title: "List Actual accounts",
    description: "List every Actual account with its official ledger balance when available.",
    inputSchema: contracts.emptyInputSchema, outputSchema: contracts.accountsOutputSchema,
    confirmation: "none", bounds: [],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_get_account", domain: "accounts", capability: "read", idempotent: true,
    title: "Get Actual account",
    description: "Get one Actual account by its opaque identifier, including its official ledger balance.",
    inputSchema: contracts.accountIdInputSchema, outputSchema: contracts.accountOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_list_categories", domain: "categories", capability: "read", idempotent: true,
    title: "List Actual categories",
    description: "List Actual category groups while preserving their nested categories.",
    inputSchema: contracts.emptyInputSchema, outputSchema: contracts.categoriesOutputSchema,
    confirmation: "none", bounds: [],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_list_payees", domain: "payees", capability: "read", idempotent: true,
    title: "List Actual payees",
    description: "List every Actual payee with its opaque identifier and user-authored name.",
    inputSchema: contracts.emptyInputSchema, outputSchema: contracts.payeesOutputSchema,
    confirmation: "none", bounds: ["MAX_ENTITY_NAME_LENGTH"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_get_transactions", domain: "transactions", capability: "read", idempotent: true,
    title: "Get Actual transactions",
    description: `Get transactions for one account over an inclusive period of at most ${MAX_DATE_RANGE_DAYS} days.`,
    inputSchema: contracts.getTransactionsInputSchema, outputSchema: contracts.transactionsOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH","MAX_DATE_RANGE_DAYS","MAX_LEDGER_SCAN_RESULTS"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_get_transaction", domain: "transactions", capability: "read", idempotent: true,
    title: "Get exact Actual transaction",
    description: "Get one exact transaction by opaque ID, preserving transfer, starting-balance, and split identity.",
    inputSchema: contracts.getTransactionInputSchema, outputSchema: contracts.transactionOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH","LINKED_TRANSACTION_LOOKUP_LIMIT"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_search_transactions", domain: "transactions", capability: "read", idempotent: true,
    title: "Search Actual transactions",
    description: "Search transactions across accounts with typed filters, signed amounts, split-aware deterministic pagination, and optional totals.",
    inputSchema: contracts.searchTransactionsInputSchema, outputSchema: contracts.searchTransactionsOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH","MAX_DATE_RANGE_DAYS","MAX_TRANSACTION_SEARCH_RESULTS","MAX_TRANSACTION_SEARCH_OFFSET"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_preview_import", domain: "import", capability: "read", idempotent: true,
    title: "Preview Actual transaction import",
    description: "Run the official reconciliation pipeline in read-only dry-run mode and return truthful preview evidence plus a request fingerprint.",
    inputSchema: contracts.previewImportInputSchema, outputSchema: contracts.previewImportOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH","MAX_IMPORT_BATCH"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_bulk_update_transactions", domain: "transactions", capability: "write", idempotent: true,
    title: "Bulk update Actual transactions safely",
    description: `Plan up to ${MAX_BULK_TRANSACTION_UPDATES} heterogeneous desired-state updates in dry-run mode by default; execution requires dryRun false and confirmWrite true.`,
    inputSchema: contracts.bulkUpdateTransactionsInputSchema, outputSchema: contracts.bulkUpdateTransactionsOutputSchema,
    confirmation: "confirm-write", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH","MAX_TEXT_LENGTH","MAX_DATE_RANGE_DAYS","MAX_BULK_TRANSACTION_UPDATES"],
    synchronization: "write-and-sync", partialFailure: "multi-step"
  }),
  defineTool({
    name: "actual_import_transactions", domain: "import", capability: "write", idempotent: true,
    title: "Import Actual transactions",
    description: `Import up to ${MAX_IMPORT_BATCH} transactions idempotently using required opaque imported_id values.`,
    inputSchema: contracts.importTransactionsInputSchema, outputSchema: contracts.importTransactionsOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH","MAX_DATE_RANGE_DAYS","MAX_IMPORT_BATCH"],
    synchronization: "write-and-sync", partialFailure: "multi-step"
  }),
  defineTool({
    name: "actual_update_transaction", domain: "transactions", capability: "write", idempotent: false,
    title: "Update Actual transaction",
    description: "Update only the permitted fields of one Actual transaction, then synchronize.",
    inputSchema: contracts.updateTransactionInputSchema, outputSchema: contracts.transactionMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH","MAX_TEXT_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_delete_transaction", domain: "transactions", capability: "destructive", idempotent: false,
    title: "Delete Actual transaction",
    description: "DESTRUCTIVE OPERATION: Permanently delete one Actual transaction only after explicit confirmation, then synchronize.",
    inputSchema: deleteTransactionToolInputSchema, outputSchema: contracts.transactionMutationOutputSchema,
    confirmation: "confirm-destructive", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_list_transfer_payees", domain: "transfers", capability: "read", idempotent: true,
    title: "List Actual transfer payees",
    description: "List official transfer payees with exact destination account metadata.",
    inputSchema: contracts.emptyInputSchema, outputSchema: contracts.transferPayeesOutputSchema,
    confirmation: "none", bounds: ["MAX_ENTITY_NAME_LENGTH","MAX_TEXT_LENGTH"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_get_transfer", domain: "transfers", capability: "read", idempotent: true,
    title: "Get exact Actual transfer",
    description: "Inspect one reciprocal transfer pair by either exact transaction ID and return integrity evidence.",
    inputSchema: contracts.getTransferInputSchema, outputSchema: contracts.getTransferOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH","LINKED_TRANSACTION_LOOKUP_LIMIT"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_search_transfers", domain: "transfers", capability: "read", idempotent: true,
    title: "Search Actual transfers",
    description: "Search bounded reciprocal transfer evidence with integrity filters and deterministic pagination.",
    inputSchema: contracts.searchTransfersInputSchema, outputSchema: contracts.searchTransfersOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH","MAX_DATE_RANGE_DAYS","MAX_TRANSACTION_SEARCH_RESULTS","MAX_TRANSACTION_SEARCH_OFFSET","MAX_LEDGER_SCAN_RESULTS","LEDGER_QUERY_SENTINEL_LIMIT"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_create_transfer", domain: "transfers", capability: "write", idempotent: false,
    title: "Preview or create an Actual transfer",
    description: "Preview by default; creation requires dryRun false and confirmWrite true and is non-idempotent.",
    inputSchema: contracts.createTransferInputSchema, outputSchema: contracts.createTransferOutputSchema,
    confirmation: "confirm-write", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH","MAX_TEXT_LENGTH","MAX_LEDGER_SCAN_RESULTS","LEDGER_QUERY_SENTINEL_LIMIT"],
    synchronization: "write-and-sync", partialFailure: "multi-step"
  }),
  defineTool({
    name: "actual_find_possible_transfers", domain: "transfers", capability: "read", idempotent: true,
    title: "Find possible unlinked Actual transfers",
    description: "Classify bounded opposite-amount cross-account candidates without linking or mutation.",
    inputSchema: contracts.findPossibleTransfersInputSchema, outputSchema: contracts.findPossibleTransfersOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH","MAX_DATE_RANGE_DAYS","MAX_TRANSACTION_SEARCH_RESULTS","MAX_TRANSACTION_SEARCH_OFFSET","MAX_DIAGNOSTIC_WINDOW_DAYS","MAX_LEDGER_SCAN_RESULTS","LEDGER_QUERY_SENTINEL_LIMIT"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_find_possible_duplicates", domain: "transactions", capability: "read", idempotent: true,
    title: "Find possible duplicate Actual transactions",
    description: "Classify bounded same-account duplicate candidates without merge, deletion, or mutation.",
    inputSchema: contracts.findPossibleDuplicatesInputSchema, outputSchema: contracts.findPossibleDuplicatesOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TRANSACTION_SEARCH_RESULTS","MAX_TRANSACTION_SEARCH_OFFSET","MAX_DIAGNOSTIC_WINDOW_DAYS","MAX_LEDGER_SCAN_RESULTS","LEDGER_QUERY_SENTINEL_LIMIT"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_get_account_reconciliation", domain: "reconciliation", capability: "read", idempotent: true,
    title: "Get Actual account reconciliation diagnostics",
    description: "Compute a read-only split-safe cutoff snapshot with optional signed statement differences.",
    inputSchema: contracts.accountReconciliationInputSchema, outputSchema: contracts.accountReconciliationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_DATE_RANGE_DAYS","MAX_LEDGER_SCAN_RESULTS","LEDGER_QUERY_SENTINEL_LIMIT"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_create_account", domain: "accounts", capability: "write", idempotent: false,
    title: "Create Actual account",
    description: "Create an Actual account with an optional signed integer opening balance, then synchronize and verify it.",
    inputSchema: contracts.createAccountInputSchema, outputSchema: contracts.accountMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_update_account", domain: "accounts", capability: "write", idempotent: true,
    title: "Update Actual account",
    description: "Update only the name and/or off-budget state of an Actual account, then verify the persisted state.",
    inputSchema: contracts.updateAccountInputSchema, outputSchema: contracts.accountMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_close_account", domain: "accounts", capability: "write", idempotent: true,
    title: "Safely close Actual account",
    description: "Safely close a non-empty Actual account after complete history and balance-transfer preflight.",
    inputSchema: contracts.closeAccountInputSchema, outputSchema: contracts.accountMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_reopen_account", domain: "accounts", capability: "write", idempotent: true,
    title: "Reopen Actual account",
    description: "Reopen a closed Actual account, synchronize, and verify the desired state.",
    inputSchema: contracts.accountIdInputSchema, outputSchema: contracts.accountMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_delete_account", domain: "accounts", capability: "destructive", idempotent: false,
    title: "Delete empty Actual account",
    description: "DESTRUCTIVE OPERATION: Permanently delete an account only after literal confirmation and complete history proves it is empty.",
    inputSchema: deleteAccountToolInputSchema, outputSchema: contracts.accountDeletionOutputSchema,
    confirmation: "confirm-destructive", bounds: ["MAX_ID_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_create_category_group", domain: "categories", capability: "write", idempotent: false,
    title: "Create Actual category group",
    description: "Create a visible expense or income category group, synchronize, and verify it.",
    inputSchema: contracts.createCategoryGroupInputSchema, outputSchema: contracts.categoryGroupMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_update_category_group", domain: "categories", capability: "write", idempotent: true,
    title: "Rename Actual category group",
    description: "Rename an Actual category group without changing its type or visibility.",
    inputSchema: contracts.updateCategoryGroupInputSchema, outputSchema: contracts.categoryGroupMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_delete_category_group", domain: "categories", capability: "destructive", idempotent: false,
    title: "Delete empty Actual category group",
    description: "DESTRUCTIVE OPERATION: Permanently delete a category group only after literal confirmation and a complete read proves it has no categories.",
    inputSchema: deleteCategoryGroupToolInputSchema, outputSchema: contracts.categoryGroupDeletionOutputSchema,
    confirmation: "confirm-destructive", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_create_category", domain: "categories", capability: "write", idempotent: false,
    title: "Create Actual category",
    description: "Create a visible category whose income or expense type is derived from its persisted group.",
    inputSchema: contracts.createCategoryInputSchema, outputSchema: contracts.categoryMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_update_category", domain: "categories", capability: "write", idempotent: true,
    title: "Rename Actual category",
    description: "Rename an Actual category without changing its group, type, or visibility.",
    inputSchema: contracts.updateCategoryInputSchema, outputSchema: contracts.categoryMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_move_category", domain: "categories", capability: "write", idempotent: true,
    title: "Move Actual category",
    description: "Move a category to another group only when both persisted income or expense types match.",
    inputSchema: contracts.moveCategoryInputSchema, outputSchema: contracts.categoryMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_hide_category", domain: "categories", capability: "write", idempotent: true,
    title: "Hide Actual category",
    description: "Set an Actual category to hidden and verify the persisted desired state.",
    inputSchema: contracts.categoryIdInputSchema, outputSchema: contracts.categoryMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_unhide_category", domain: "categories", capability: "write", idempotent: true,
    title: "Unhide Actual category",
    description: "Set an Actual category to visible and verify the persisted desired state.",
    inputSchema: contracts.categoryIdInputSchema, outputSchema: contracts.categoryMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_delete_category", domain: "categories", capability: "destructive", idempotent: false,
    title: "Delete unused Actual category",
    description: "DESTRUCTIVE OPERATION: Permanently delete a category only after literal confirmation and complete transaction and budget scans prove it is unused.",
    inputSchema: deleteCategoryToolInputSchema, outputSchema: contracts.categoryDeletionOutputSchema,
    confirmation: "confirm-destructive", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_get_payee", domain: "payees", capability: "read", idempotent: true,
    title: "Get Actual payee",
    description: "Get one Actual payee and its official transfer-account relationship when present.",
    inputSchema: contracts.payeeIdInputSchema, outputSchema: contracts.payeeOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_create_payee", domain: "payees", capability: "write", idempotent: true,
    title: "Create Actual payee",
    description: "Create an ordinary payee or return the single exact existing ordinary payee, then verify persisted state.",
    inputSchema: contracts.createPayeeInputSchema, outputSchema: contracts.payeeMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_update_payee", domain: "payees", capability: "write", idempotent: true,
    title: "Rename Actual payee",
    description: "Rename one ordinary payee to the desired trimmed name; transfer payees are protected.",
    inputSchema: contracts.updatePayeeInputSchema, outputSchema: contracts.payeeMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_delete_payee", domain: "payees", capability: "destructive", idempotent: false,
    title: "Delete unused Actual payee",
    description: "DESTRUCTIVE OPERATION: Preflight all transaction and rule references, then delete one proven-unused ordinary payee only with literal confirmation.",
    inputSchema: deletePayeeToolInputSchema, outputSchema: contracts.payeeDeletionOutputSchema,
    confirmation: "confirm-destructive", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_merge_payees", domain: "payees", capability: "destructive", idempotent: false,
    title: "Merge Actual payees",
    description: "DESTRUCTIVE OPERATION: Preflight and merge ordinary source payees into one distinct ordinary target only with literal confirmation.",
    inputSchema: mergePayeesToolInputSchema, outputSchema: contracts.payeeMergeOutputSchema,
    confirmation: "confirm-destructive", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH","MAX_PAYEE_MERGE_SOURCES"],
    synchronization: "write-and-sync", partialFailure: "multi-step"
  }),
  defineTool({
    name: "actual_list_rules", domain: "rules", capability: "read", idempotent: true,
    title: "List Actual rules",
    description: "List every Actual rule in official execution order with complete pinned semantics and MCP writability.",
    inputSchema: contracts.emptyInputSchema, outputSchema: contracts.rulesOutputSchema,
    confirmation: "none", bounds: ["MAX_TEXT_LENGTH"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_get_rule", domain: "rules", capability: "read", idempotent: true,
    title: "Get Actual rule",
    description: "Get one Actual rule by stable opaque identifier with complete pinned semantics and MCP writability.",
    inputSchema: contracts.ruleIdInputSchema, outputSchema: contracts.ruleOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_create_rule", domain: "rules", capability: "write", idempotent: false,
    title: "Create Actual rule",
    description: "Create one supported non-destructive Actual rule after validating every referenced entity.",
    inputSchema: contracts.createRuleInputSchema, outputSchema: contracts.ruleMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH","MAX_TEXT_LENGTH","MAX_RULE_CONDITIONS","MAX_RULE_ACTIONS","MAX_RULE_LIST_VALUES"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_update_rule", domain: "rules", capability: "write", idempotent: true,
    title: "Update Actual rule",
    description: "Apply allowlisted desired-state changes to one MCP-writable rule using the official full-object update.",
    inputSchema: contracts.updateRuleInputSchema, outputSchema: contracts.ruleMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH","MAX_TEXT_LENGTH","MAX_RULE_CONDITIONS","MAX_RULE_ACTIONS","MAX_RULE_LIST_VALUES"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_delete_rule", domain: "rules", capability: "destructive", idempotent: false,
    title: "Delete Actual rule",
    description: "DESTRUCTIVE OPERATION: Delete one identified rule only with literal confirmation and respect Actual-protected rules.",
    inputSchema: deleteRuleToolInputSchema, outputSchema: contracts.ruleDeletionOutputSchema,
    confirmation: "confirm-destructive", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_list_schedules", domain: "schedules", capability: "read", idempotent: true,
    title: "List Actual schedules",
    description: "List stable schedule projections with bounded pagination and optional account/completion filters.",
    inputSchema: contracts.listSchedulesInputSchema, outputSchema: contracts.listSchedulesOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH","MAX_TEXT_LENGTH","MAX_SCHEDULE_RESULTS","MAX_SCHEDULE_OFFSET"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_get_schedule", domain: "schedules", capability: "read", idempotent: true,
    title: "Get Actual schedule",
    description: "Get one exact stable schedule projection through the complete public schedule list.",
    inputSchema: contracts.getScheduleInputSchema, outputSchema: contracts.getScheduleOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH","MAX_TEXT_LENGTH"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_create_schedule", domain: "schedules", capability: "write", idempotent: false,
    title: "Create Actual schedule",
    description: "Create and verify a supported one-time or recurring schedule with explicit amount semantics.",
    inputSchema: contracts.createScheduleInputSchema, outputSchema: contracts.scheduleMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH","MAX_TEXT_LENGTH","MAX_SCHEDULE_PATTERNS"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_update_schedule", domain: "schedules", capability: "write", idempotent: true,
    title: "Update Actual schedule",
    description: "Apply a non-empty allowlisted desired-state update and verify the persisted schedule.",
    inputSchema: contracts.updateScheduleInputSchema, outputSchema: contracts.scheduleMutationOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH","MAX_TEXT_LENGTH","MAX_SCHEDULE_PATTERNS"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_delete_schedule", domain: "schedules", capability: "destructive", idempotent: false,
    title: "Delete Actual schedule",
    description: "DESTRUCTIVE OPERATION: Delete one schedule after confirmation while verifying historical transactions remain.",
    inputSchema: deleteScheduleToolInputSchema, outputSchema: contracts.scheduleDeletionOutputSchema,
    confirmation: "confirm-destructive", bounds: ["MAX_ID_LENGTH","MAX_ENTITY_NAME_LENGTH","MAX_TEXT_LENGTH","MAX_LEDGER_SCAN_RESULTS","LEDGER_QUERY_SENTINEL_LIMIT"],
    synchronization: "write-and-sync", partialFailure: "sync-after-write"
  }),
  defineTool({
    name: "actual_get_month_summary", domain: "summaries", capability: "read", idempotent: true,
    title: "Get monthly financial summary",
    description: "Return signed ledger totals and a separately sourced official budget month when the scope is compatible.",
    inputSchema: contracts.monthSummaryInputSchema, outputSchema: contracts.monthSummaryOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH","MAX_DATE_RANGE_DAYS","MAX_SUMMARY_SCOPE_IDS","MAX_TOP_PAYEE_RESULTS","MAX_LEDGER_SCAN_RESULTS","LEDGER_QUERY_SENTINEL_LIMIT"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_get_spending_summary", domain: "summaries", capability: "read", idempotent: true,
    title: "Get spending summary",
    description: "Return signed expense totals, deterministic category/group breakdowns, and bounded top payees.",
    inputSchema: contracts.rangeSummaryInputSchema, outputSchema: contracts.spendingSummaryOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH","MAX_DATE_RANGE_DAYS","MAX_SUMMARY_SCOPE_IDS","MAX_TOP_PAYEE_RESULTS","MAX_LEDGER_SCAN_RESULTS","LEDGER_QUERY_SENTINEL_LIMIT"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_get_income_summary", domain: "summaries", capability: "read", idempotent: true,
    title: "Get income summary",
    description: "Return signed income totals, deterministic category breakdowns, and bounded top payees.",
    inputSchema: contracts.rangeSummaryInputSchema, outputSchema: contracts.incomeSummaryOutputSchema,
    confirmation: "none", bounds: ["MAX_ID_LENGTH","MAX_TEXT_LENGTH","MAX_DATE_RANGE_DAYS","MAX_SUMMARY_SCOPE_IDS","MAX_TOP_PAYEE_RESULTS","MAX_LEDGER_SCAN_RESULTS","LEDGER_QUERY_SENTINEL_LIMIT"],
    synchronization: "none", partialFailure: "none"
  }),
  defineTool({
    name: "actual_get_runtime_status", domain: "runtime", capability: "read", idempotent: true,
    title: "Get MCP runtime status",
    description: "Return sanitized process-lifetime connectivity, policy, cache, queue, version, and observed-sync status.",
    inputSchema: contracts.emptyInputSchema, outputSchema: contracts.runtimeStatusOutputSchema,
    confirmation: "none", bounds: [],
    synchronization: "none", partialFailure: "none"
  })
] as const;

export type ToolName = typeof TOOL_DEFINITIONS[number]['name'];
export const TOOL_NAMES = TOOL_DEFINITIONS.map(definition => definition.name) as ToolName[];
export const TOOL_CAPABILITIES = new Map(TOOL_DEFINITIONS.map(definition => [definition.name, definition] as const));

export function annotationsFor(definition: ToolDefinition) {
  return { readOnlyHint: definition.capability === 'read', destructiveHint: definition.capability === 'destructive', idempotentHint: definition.idempotent };
}

export function enforceToolPolicy(definition: ToolDefinition, policy: OperationalConfig): void {
  if (policy.readOnly && definition.capability !== 'read') throw new PublicError('READ_ONLY_MODE', 'This MCP process is configured in read-only mode.', definition.name, false);
  if (!policy.allowDestructive && definition.capability === 'destructive') throw new PublicError('DESTRUCTIVE_OPERATIONS_DISABLED', 'Destructive MCP operations are disabled for this process.', definition.name, false);
}
