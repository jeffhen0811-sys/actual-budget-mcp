import type { StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import * as contracts from './contracts.js';

/** Stable entity projections reused by public output contracts. */
export const CANONICAL_PUBLIC_MODELS = {
  Account: {
    schema: contracts.accountSchema,
    tools: ['actual_list_accounts', 'actual_get_account', 'actual_create_account', 'actual_update_account', 'actual_close_account', 'actual_reopen_account']
  },
  Transaction: {
    schema: contracts.transactionSchema,
    tools: ['actual_get_transactions', 'actual_get_transaction', 'actual_search_transactions', 'actual_update_transaction', 'actual_bulk_update_transactions']
  },
  CategoryGroup: {
    schema: contracts.categoryGroupSchema,
    tools: ['actual_list_categories']
  },
  Category: {
    schema: contracts.categorySchema,
    tools: ['actual_list_categories']
  },
  Payee: {
    schema: contracts.payeeSchema,
    tools: ['actual_list_payees']
  },
  Rule: {
    schema: contracts.ruleSchema,
    tools: ['actual_list_rules', 'actual_get_rule', 'actual_create_rule', 'actual_update_rule']
  },
  BudgetMonth: {
    schema: contracts.budgetMonthOutputSchema,
    tools: ['actual_get_budget_month', 'actual_get_month_summary']
  },
  Schedule: {
    schema: contracts.scheduleSchema,
    tools: ['actual_list_schedules', 'actual_get_schedule', 'actual_create_schedule', 'actual_update_schedule']
  },
  TransferPair: {
    schema: contracts.transferPairSchema,
    tools: ['actual_get_transfer', 'actual_search_transfers', 'actual_create_transfer']
  },
  RuntimeStatus: {
    schema: contracts.runtimeStatusOutputSchema,
    tools: ['actual_get_runtime_status']
  }
} as const;

export type CanonicalPublicModelName = keyof typeof CANONICAL_PUBLIC_MODELS;

/** Frozen, intentionally distinct bounded views of a canonical entity or process state. */
export const DISTINCT_PUBLIC_VIEWS = [
  {
    name: 'CategoryGroupAdministration',
    baseModel: 'CategoryGroup',
    schema: contracts.administeredCategoryGroupSchema,
    tools: ['actual_create_category_group', 'actual_update_category_group'],
    reason: 'Mutation results preserve the established flat administration vocabulary and omit nested categories.'
  },
  {
    name: 'CategoryAdministration',
    baseModel: 'Category',
    schema: contracts.administeredCategorySchema,
    tools: ['actual_create_category', 'actual_update_category', 'actual_move_category'],
    reason: 'Mutation results include persisted group and income classification that are implicit in the nested list view.'
  },
  {
    name: 'PayeeAdministration',
    baseModel: 'Payee',
    schema: contracts.administeredPayeeSchema,
    tools: ['actual_get_payee', 'actual_create_payee', 'actual_update_payee', 'actual_merge_payees'],
    reason: 'Administration calls preserve optional transfer-account context; the all-payees list remains the frozen compact view.'
  },
  {
    name: 'BudgetSummary',
    baseModel: 'BudgetMonth',
    schema: contracts.budgetSummaryOutputSchema,
    tools: ['actual_get_budget_summary'],
    reason: 'The summary keeps official aggregates while bounding and reporting omitted category detail.'
  },
  {
    name: 'RuntimeHealth',
    baseModel: 'RuntimeStatus',
    schema: contracts.healthOutputSchema,
    tools: ['actual_health'],
    reason: 'Health is a compact connectivity probe and intentionally omits queue, mode, cache, and synchronization telemetry.'
  },
  {
    name: 'TransferCandidate',
    baseModel: 'TransferPair',
    schema: contracts.transferCandidateSchema,
    tools: ['actual_find_possible_transfers'],
    reason: 'Candidate discovery returns two ordinary transactions plus bounded matching evidence, not an observed reciprocal pair.'
  }
] as const satisfies readonly {
  name: string;
  baseModel: CanonicalPublicModelName;
  schema: StandardSchemaWithJSON;
  tools: readonly string[];
  reason: string;
}[];
