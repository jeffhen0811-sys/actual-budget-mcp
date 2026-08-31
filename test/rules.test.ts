import { describe, expect, it } from 'vitest';
import type { AdapterRule } from '../src/actual/adapter.js';
import {
  fromSdkRuleStage,
  isWritableRuleAction,
  isWritableRuleCondition,
  projectRule,
  toSdkRule,
  toSdkRuleStage
} from '../src/actual/rules.js';

describe('rule boundary projection', () => {
  it('translates the default stage in both directions', () => {
    expect(fromSdkRuleStage(null)).toBe('default');
    expect(fromSdkRuleStage('pre')).toBe('pre');
    expect(toSdkRuleStage('default')).toBeNull();
    expect(toSdkRuleStage('post')).toBe('post');
  });

  it('preserves complete pinned read shapes while classifying advanced actions read-only', () => {
    const rule: AdapterRule = {
      id: 'rule-id',
      stage: null,
      conditionsOp: 'or',
      conditions: [{ field: 'payee', op: 'oneOf', value: ['payee-a', 'payee-b'], type: 'id', options: null }],
      actions: [{ op: 'set-split-amount', value: null, options: { method: 'remainder', splitIndex: 1 } }]
    };
    const projected = projectRule(rule);
    expect(projected).toMatchObject({ id: 'rule-id', stage: 'default', conditionsOp: 'or', writable: false });
    expect(projected.conditions).toEqual(rule.conditions);
    expect(projected.actions).toEqual(rule.actions);
    expect(projected.conditions).not.toBe(rule.conditions);
    expect(projected.writeRestriction).toEqual(expect.any(String));
  });

  it('accepts supported field/operator/value combinations and refuses arbitrary metadata', () => {
    expect(isWritableRuleCondition({ field: 'amount', op: 'isbetween', value: { num1: -2000, num2: -1000 }, options: { outflow: true }, type: 'number' })).toBe(true);
    expect(isWritableRuleCondition({ field: 'imported_payee', op: 'contains', value: 'market', type: 'string' })).toBe(true);
    expect(isWritableRuleCondition({ field: 'payee', op: 'oneOf', value: ['p1', 'p2'], type: 'id' })).toBe(true);
    expect(isWritableRuleCondition({ field: 'payee', op: 'oneOf', value: [], type: 'id' })).toBe(false);
    expect(isWritableRuleCondition({ field: 'payee', op: 'is', value: 'p1', customName: 'unsafe' })).toBe(false);
  });

  it('limits writable actions and strips MCP-derived fields from SDK payloads', () => {
    expect(isWritableRuleAction({ op: 'set', field: 'category', value: 'category-id' })).toBe(true);
    expect(isWritableRuleAction({ op: 'append-notes', value: 'reviewed' })).toBe(true);
    expect(isWritableRuleAction({ op: 'delete-transaction', value: '' })).toBe(false);
    expect(isWritableRuleAction({ op: 'set', field: 'amount', value: 100, options: { formula: 'unsafe' } })).toBe(false);

    expect(toSdkRule({
      stage: 'default',
      conditionsOp: 'and',
      conditions: [{ field: 'imported_payee', op: 'contains', value: 'market' }],
      actions: [{ op: 'set', field: 'category', value: 'category-id' }]
    }, 'rule-id')).toEqual({
      id: 'rule-id',
      stage: null,
      conditionsOp: 'and',
      conditions: [{ field: 'imported_payee', op: 'contains', value: 'market' }],
      actions: [{ op: 'set', field: 'category', value: 'category-id' }]
    });
  });
});
