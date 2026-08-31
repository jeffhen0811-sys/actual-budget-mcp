import { describe, expect, it } from 'vitest';
import {
  administeredPayeeSchema,
  createPayeeInputSchema,
  createRuleInputSchema,
  mergePayeesInputSchema,
  ruleSchema,
  updatePayeeInputSchema,
  updateRuleInputSchema,
  writableRuleActionSchema,
  writableRuleConditionSchema
} from '../src/mcp/contracts.js';

describe('payee administration schemas', () => {
  it('preserves transfer nullability without changing the legacy list schema', () => {
    expect(administeredPayeeSchema.parse({ id: 'payee', name: 'Ordinary' })).toEqual({ id: 'payee', name: 'Ordinary' });
    expect(administeredPayeeSchema.parse({ id: 'transfer', name: 'Checking', transferAccountId: null })).toMatchObject({ transferAccountId: null });
    expect(administeredPayeeSchema.parse({ id: 'transfer', name: 'Checking', transferAccountId: 'account' })).toMatchObject({ transferAccountId: 'account' });
  });

  it('trims names and rejects empty or arbitrary payee writes', () => {
    expect(createPayeeInputSchema.parse({ name: '  Cafe  ' })).toEqual({ name: 'Cafe' });
    expect(updatePayeeInputSchema.parse({ payeeId: 'payee', name: '  Renamed  ' })).toMatchObject({ name: 'Renamed' });
    expect(() => createPayeeInputSchema.parse({ name: ' ', category: 'category' })).toThrow();
    expect(() => updatePayeeInputSchema.parse({ payeeId: 'payee', name: 'Name', transferAccountId: 'account' })).toThrow();
  });

  it('requires unique, non-empty, distinct merge relationships and literal confirmation', () => {
    expect(mergePayeesInputSchema.parse({ sourcePayeeIds: ['source'], targetPayeeId: 'target', confirmDestructive: true })).toMatchObject({ targetPayeeId: 'target' });
    expect(() => mergePayeesInputSchema.parse({ sourcePayeeIds: [], targetPayeeId: 'target', confirmDestructive: true })).toThrow();
    expect(() => mergePayeesInputSchema.parse({ sourcePayeeIds: ['source', 'source'], targetPayeeId: 'target', confirmDestructive: true })).toThrow();
    expect(() => mergePayeesInputSchema.parse({ sourcePayeeIds: ['target'], targetPayeeId: 'target', confirmDestructive: true })).toThrow();
    expect(() => mergePayeesInputSchema.parse({ sourcePayeeIds: ['source'], targetPayeeId: 'target', confirmDestructive: false })).toThrow();
  });
});

describe('rule administration schemas', () => {
  it('accepts representative supported condition variants with field-appropriate values', () => {
    const conditions = [
      { field: 'payee', op: 'oneOf', value: ['p1', 'p2'] },
      { field: 'imported_payee', op: 'contains', value: 'market' },
      { field: 'amount', op: 'isbetween', value: { num1: -2000, num2: -1000 }, options: { outflow: true } },
      { field: 'date', op: 'gte', value: '2026-08-01' },
      { field: 'cleared', op: 'is', value: true }
    ];
    for (const condition of conditions) expect(() => writableRuleConditionSchema.parse(condition)).not.toThrow();
  });

  it('rejects invalid operators, values, arrays, options, and destructive or advanced actions', () => {
    const invalidConditions = [
      { field: 'amount', op: 'contains', value: 100 },
      { field: 'cleared', op: 'is', value: 'true' },
      { field: 'payee', op: 'oneOf', value: [] },
      { field: 'amount', op: 'is', value: 1.5 },
      { field: 'date', op: 'is', value: '2026-02-30' },
      { field: 'payee', op: 'is', value: 'p1', options: { arbitrary: true } }
    ];
    for (const condition of invalidConditions) expect(() => writableRuleConditionSchema.parse(condition)).toThrow();
    for (const action of [
      { op: 'delete-transaction', value: '' },
      { op: 'set-split-amount', value: 100 },
      { op: 'link-schedule', value: 'schedule' },
      { op: 'set', field: 'amount', value: 100, options: { formula: 'unsafe' } },
      { op: 'set', field: 'unknown', value: 'value' }
    ]) expect(() => writableRuleActionSchema.parse(action)).toThrow();
  });

  it('requires complete non-empty creates and non-empty allowlisted updates', () => {
    const valid = {
      stage: 'default', conditionsOp: 'and',
      conditions: [{ field: 'imported_payee', op: 'contains', value: 'market' }],
      actions: [{ op: 'set', field: 'category', value: 'category' }]
    };
    expect(() => createRuleInputSchema.parse(valid)).not.toThrow();
    expect(() => createRuleInputSchema.parse({ ...valid, conditions: [] })).toThrow();
    expect(() => createRuleInputSchema.parse({ ...valid, actions: [] })).toThrow();
    expect(() => createRuleInputSchema.parse({ ...valid, arbitrary: true })).toThrow();
    expect(() => updateRuleInputSchema.parse({ ruleId: 'rule' })).toThrow();
    expect(() => updateRuleInputSchema.parse({ ruleId: 'rule', actions: [] })).toThrow();
    expect(() => updateRuleInputSchema.parse({ ruleId: 'rule', stage: 'post' })).not.toThrow();
  });

  it('reads advanced pinned actions and nullable values without treating them as writable', () => {
    const advanced = {
      id: 'rule', stage: 'pre', conditionsOp: 'or',
      conditions: [{ field: 'payee', op: 'oneOf', value: ['p1', 'p2'], type: 'id', options: null }],
      actions: [{ op: 'set-split-amount', value: null, options: { method: 'remainder', splitIndex: 1 } }],
      writable: false,
      writeRestriction: 'Advanced action.'
    };
    expect(ruleSchema.parse(advanced)).toEqual(advanced);
  });
});
