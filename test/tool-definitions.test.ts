import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  TOOL_DEFINITIONS,
  annotationsFor,
  type ConfirmationModel,
  type PartialFailureClassification,
  type SynchronizationPolicy,
  type ToolDomain
} from '../src/mcp/tool-definitions.js';
import { PUBLIC_LIMIT_CATALOG } from '../src/schemas.js';

const domains = new Set<ToolDomain>([
  'runtime', 'accounts', 'categories', 'payees', 'rules', 'transactions', 'import', 'budget',
  'transfers', 'reconciliation', 'schedules', 'summaries'
]);
const confirmations = new Set<ConfirmationModel>(['none', 'confirm-destructive', 'confirm-write', 'budget-copy']);
const synchronizationPolicies = new Set<SynchronizationPolicy>(['none', 'sync-only', 'write-and-sync', 'write-without-sync']);
const partialFailures = new Set<PartialFailureClassification>(['none', 'sync-failure', 'sync-after-write', 'multi-step']);
const knownBounds = new Set(Object.keys(PUBLIC_LIMIT_CATALOG));

describe('authoritative tool definitions', () => {
  it('classifies the complete registry and carries every contract field', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(62);
    expect(new Set(TOOL_DEFINITIONS.map(definition => definition.name)).size).toBe(62);
    expect(TOOL_DEFINITIONS.filter(definition => definition.capability === 'read')).toHaveLength(27);
    expect(TOOL_DEFINITIONS.filter(definition => definition.capability !== 'read')).toHaveLength(35);
    expect(TOOL_DEFINITIONS.filter(definition => definition.capability === 'destructive')).toHaveLength(9);

    for (const definition of TOOL_DEFINITIONS) {
      expect(domains.has(definition.domain), definition.name).toBe(true);
      expect(definition.title.trim(), definition.name).not.toBe('');
      expect(definition.description.trim(), definition.name).not.toBe('');
      expect(definition.inputSchema['~standard'], definition.name).toBeDefined();
      expect(definition.outputSchema['~standard'], definition.name).toBeDefined();
      expect(confirmations.has(definition.confirmation), definition.name).toBe(true);
      expect(synchronizationPolicies.has(definition.synchronization), definition.name).toBe(true);
      expect(partialFailures.has(definition.partialFailure), definition.name).toBe(true);
      expect(new Set(definition.bounds).size, definition.name).toBe(definition.bounds.length);
      expect(definition.bounds.every(bound => knownBounds.has(bound)), definition.name).toBe(true);
      expect(annotationsFor(definition)).toEqual({
        readOnlyHint: definition.capability === 'read',
        destructiveHint: definition.capability === 'destructive',
        idempotentHint: definition.idempotent
      });
    }
  });

  it('declares consent, synchronization, and partial failure consistently', () => {
    for (const definition of TOOL_DEFINITIONS) {
      if (definition.capability === 'read') {
        expect(definition.confirmation, definition.name).toBe('none');
        expect(definition.synchronization, definition.name).toBe('none');
        expect(definition.partialFailure, definition.name).toBe('none');
      } else {
        expect(definition.synchronization, definition.name).not.toBe('none');
      }
      if (definition.capability === 'destructive' && definition.name !== 'actual_copy_budget_month') {
        expect(definition.confirmation, definition.name).toBe('confirm-destructive');
      }
    }
    expect(TOOL_DEFINITIONS.find(definition => definition.name === 'actual_copy_budget_month')).toMatchObject({
      confirmation: 'budget-copy', partialFailure: 'multi-step'
    });
    expect(TOOL_DEFINITIONS.find(definition => definition.name === 'actual_sync')).toMatchObject({
      synchronization: 'sync-only', partialFailure: 'sync-failure'
    });
  });

  it('registers each handler from the definitions without duplicate annotations or schemas', async () => {
    const serverSource = await readFile('src/mcp/server.ts', 'utf8');
    expect(serverSource.match(/annotations:/g)).toHaveLength(1);
    expect(serverSource.match(/inputSchema:/g)).toHaveLength(1);
    expect(serverSource.match(/outputSchema:/g)).toHaveLength(1);
    expect(serverSource).not.toMatch(/readOnlyHint:|destructiveHint:|idempotentHint:/);
    for (const definition of TOOL_DEFINITIONS) {
      expect(serverSource.match(new RegExp(`definitionFor\\('${definition.name}'\\)`, 'g')), definition.name).toHaveLength(1);
    }
  });
});
