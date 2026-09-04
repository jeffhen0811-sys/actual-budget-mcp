export type ToolCapability = 'read' | 'write' | 'destructive';

export interface ToolCapabilityDefinition<Name extends string = string> {
  name: Name;
  capability: ToolCapability;
  idempotent: boolean;
}

const read = (name: string): ToolCapabilityDefinition => ({ name, capability: 'read', idempotent: true });
const write = (name: string, idempotent: boolean): ToolCapabilityDefinition => ({ name, capability: 'write', idempotent });
const destructive = (name: string, idempotent = false): ToolCapabilityDefinition => ({ name, capability: 'destructive', idempotent });

/** Authoritative inventory used for discovery annotations and operational guards. */
export const TOOL_REGISTRY = [
  read('actual_health'),
  write('actual_sync', true),
  read('actual_list_budget_months'), read('actual_get_budget_month'), read('actual_get_budget_summary'),
  write('actual_set_budget_amount', true), write('actual_set_budget_carryover', true),
  write('actual_hold_budget_for_next_month', false), write('actual_reset_budget_hold', true), destructive('actual_copy_budget_month', true),
  read('actual_list_accounts'), read('actual_get_account'), read('actual_list_categories'), read('actual_list_payees'),
  read('actual_get_transactions'), read('actual_get_transaction'), read('actual_search_transactions'), read('actual_preview_import'),
  write('actual_bulk_update_transactions', true), write('actual_import_transactions', true), write('actual_update_transaction', false), destructive('actual_delete_transaction'),
  read('actual_list_transfer_payees'), read('actual_get_transfer'), read('actual_search_transfers'), write('actual_create_transfer', false),
  read('actual_find_possible_transfers'), read('actual_find_possible_duplicates'), read('actual_get_account_reconciliation'),
  write('actual_create_account', false), write('actual_update_account', true), write('actual_close_account', true), write('actual_reopen_account', true), destructive('actual_delete_account'),
  write('actual_create_category_group', false), write('actual_update_category_group', true), destructive('actual_delete_category_group'),
  write('actual_create_category', false), write('actual_update_category', true), write('actual_move_category', true), write('actual_hide_category', true), write('actual_unhide_category', true), destructive('actual_delete_category'),
  read('actual_get_payee'), write('actual_create_payee', true), write('actual_update_payee', true), destructive('actual_delete_payee'), destructive('actual_merge_payees'),
  read('actual_list_rules'), read('actual_get_rule'), write('actual_create_rule', false), write('actual_update_rule', true), destructive('actual_delete_rule'),
  read('actual_list_schedules'), read('actual_get_schedule'), write('actual_create_schedule', false), write('actual_update_schedule', true), destructive('actual_delete_schedule'),
  read('actual_get_month_summary'), read('actual_get_spending_summary'), read('actual_get_income_summary'), read('actual_get_runtime_status')
] as const satisfies readonly ToolCapabilityDefinition[];

export type ToolName = typeof TOOL_REGISTRY[number]['name'];
export const TOOL_NAMES = TOOL_REGISTRY.map(definition => definition.name) as ToolName[];
export const TOOL_CAPABILITIES = new Map(TOOL_REGISTRY.map(definition => [definition.name, definition] as const));

export function annotationsFor(definition: ToolCapabilityDefinition) {
  return {
    readOnlyHint: definition.capability === 'read',
    destructiveHint: definition.capability === 'destructive',
    idempotentHint: definition.idempotent
  };
}

export function enforceToolPolicy(definition: ToolCapabilityDefinition, policy: OperationalConfig): void {
  if (policy.readOnly && definition.capability !== 'read') {
    throw new PublicError('READ_ONLY_MODE', 'This MCP process is configured in read-only mode.', definition.name, false);
  }
  if (!policy.allowDestructive && definition.capability === 'destructive') {
    throw new PublicError('DESTRUCTIVE_OPERATIONS_DISABLED', 'Destructive MCP operations are disabled for this process.', definition.name, false);
  }
}
import type { OperationalConfig } from '../config.js';
import { PublicError } from '../errors.js';
