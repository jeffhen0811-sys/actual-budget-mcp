import { describe, expect, it } from 'vitest';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';
import { SAFE_MUTATION_ARGUMENTS } from './fixtures/safe-tool-arguments-v1.js';

describe('safe mutation policy fixtures', () => {
  it('defines one schema-valid fixture for every mutation-capable tool', async () => {
    const mutations = TOOL_DEFINITIONS.filter(definition => definition.capability !== 'read');
    expect(Object.keys(SAFE_MUTATION_ARGUMENTS).sort()).toEqual(mutations.map(definition => definition.name).sort());
    for (const definition of mutations) {
      const result = await definition.inputSchema['~standard'].validate(SAFE_MUTATION_ARGUMENTS[definition.name]);
      expect(result.issues, definition.name).toBeUndefined();
    }
  });

  it('uses literal confirmation for structural destruction and conservative defaults for previewable writes', () => {
    for (const definition of TOOL_DEFINITIONS.filter(item => item.confirmation === 'confirm-destructive')) {
      expect(SAFE_MUTATION_ARGUMENTS[definition.name]?.confirmDestructive, definition.name).toBe(true);
    }
    for (const definition of TOOL_DEFINITIONS.filter(item => item.confirmation === 'confirm-write')) {
      expect(SAFE_MUTATION_ARGUMENTS[definition.name]?.dryRun, definition.name).toBeUndefined();
      expect(SAFE_MUTATION_ARGUMENTS[definition.name]?.confirmWrite, definition.name).toBeUndefined();
    }
    expect(SAFE_MUTATION_ARGUMENTS.actual_copy_budget_month).not.toHaveProperty('dryRun');
  });
});
