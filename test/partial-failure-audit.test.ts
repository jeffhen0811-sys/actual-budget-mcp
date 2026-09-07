import { describe, expect, it } from 'vitest';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';

const expected = {
  actual_bulk_update_transactions: 'multi-step',
  actual_import_transactions: 'multi-step',
  actual_copy_budget_month: 'multi-step',
  actual_merge_payees: 'multi-step',
  actual_create_transfer: 'multi-step',
  actual_update_transaction: 'sync-after-write',
  actual_delete_transaction: 'sync-after-write'
} as const;

describe('multi-step partial-failure audit', () => {
  it('classifies every audited lifecycle with a truthful partial-state policy', () => {
    for (const [name, partialFailure] of Object.entries(expected)) {
      expect(TOOL_DEFINITIONS.find(tool => tool.name === name), name).toMatchObject({
        partialFailure,
        synchronization: 'write-and-sync'
      });
    }
  });

  it('keeps retry advice out of normal mutation descriptions', () => {
    for (const name of Object.keys(expected)) {
      const definition = TOOL_DEFINITIONS.find(tool => tool.name === name)!;
      expect(definition.description, name).not.toMatch(/automatic(?:ally)? retry|automatic(?:ally)? rollback/i);
    }
  });
});
