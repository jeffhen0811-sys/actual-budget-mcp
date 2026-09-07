import { describe, expect, it } from 'vitest';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';
import { CANONICAL_PUBLIC_MODELS, DISTINCT_PUBLIC_VIEWS } from '../src/mcp/public-models.js';

describe('public model catalog', () => {
  it('defines all ten canonical v1 projections with registered consumers', () => {
    expect(Object.keys(CANONICAL_PUBLIC_MODELS)).toEqual([
      'Account', 'Transaction', 'CategoryGroup', 'Category', 'Payee', 'Rule', 'BudgetMonth', 'Schedule',
      'TransferPair', 'RuntimeStatus'
    ]);
    const toolNames = new Set(TOOL_DEFINITIONS.map(definition => definition.name));
    for (const [name, model] of Object.entries(CANONICAL_PUBLIC_MODELS)) {
      expect(model.schema['~standard'], name).toBeDefined();
      expect(model.tools.length, name).toBeGreaterThan(0);
      expect(model.tools.every(tool => toolNames.has(tool)), name).toBe(true);
    }
  });

  it('documents every intentionally distinct view with a canonical base and registered consumers', () => {
    const toolNames = new Set(TOOL_DEFINITIONS.map(definition => definition.name));
    expect(new Set(DISTINCT_PUBLIC_VIEWS.map(view => view.name)).size).toBe(DISTINCT_PUBLIC_VIEWS.length);
    for (const view of DISTINCT_PUBLIC_VIEWS) {
      expect(CANONICAL_PUBLIC_MODELS[view.baseModel], view.name).toBeDefined();
      expect(view.schema['~standard'], view.name).toBeDefined();
      expect(view.reason.trim(), view.name).not.toBe('');
      expect(view.tools.length, view.name).toBeGreaterThan(0);
      expect(view.tools.every(tool => toolNames.has(tool)), view.name).toBe(true);
    }
  });
});
