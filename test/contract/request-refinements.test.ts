import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod/v4';
import {
  MAX_PAYEE_MERGE_SOURCES,
  MAX_RULE_ACTIONS,
  MAX_RULE_CONDITIONS,
  MAX_RULE_LIST_VALUES,
  MAX_SCHEDULE_PATTERNS
} from '../../src/schemas.js';
import {
  bulkUpdateTransactionsInputSchema,
  copyBudgetInputSchema,
  createRuleInputSchema,
  createScheduleInputSchema,
  createTransferInputSchema,
  getTransactionsInputSchema,
  mergePayeesInputSchema,
  rangeSummaryInputSchema,
  searchTransactionsInputSchema,
  searchTransfersInputSchema,
  updateAccountInputSchema,
  updateRuleInputSchema,
  updateScheduleInputSchema,
  updateTransactionInputSchema
} from '../../src/mcp/contracts.js';

interface FixtureCase {
  name: string;
  tool: keyof typeof schemas;
  arguments: unknown;
  expected?: unknown;
}

interface RefinementFixtures {
  baselineVersion: string;
  sourceCommit: string;
  accepted: FixtureCase[];
  rejectedBoundaries: FixtureCase[];
}

const schemas = {
  actual_get_transactions: getTransactionsInputSchema,
  actual_search_transactions: searchTransactionsInputSchema,
  actual_create_schedule: createScheduleInputSchema,
  actual_update_schedule: updateScheduleInputSchema,
  actual_bulk_update_transactions: bulkUpdateTransactionsInputSchema,
  actual_update_transaction: updateTransactionInputSchema,
  actual_search_transfers: searchTransfersInputSchema,
  actual_create_transfer: createTransferInputSchema,
  actual_get_spending_summary: rangeSummaryInputSchema,
  actual_copy_budget_month: copyBudgetInputSchema,
  actual_update_account: updateAccountInputSchema,
  actual_merge_payees: mergePayeesInputSchema,
  actual_create_rule: createRuleInputSchema,
  actual_update_rule: updateRuleInputSchema
} as const satisfies Record<string, z.ZodType>;

const fixtures = JSON.parse(
  await readFile('test/fixtures/contracts/v0.7.0-request-refinements.json', 'utf8')
) as RefinementFixtures;

describe('curated v0.7.0 request refinements', () => {
  it('is tied to the immutable baseline commit', () => {
    expect(fixtures.baselineVersion).toBe('0.7.0');
    expect(fixtures.sourceCommit).toBe('c5b752a5f7f3067a40480f72078907c72ad26c66');
  });

  it.each(fixtures.accepted)('preserves accepted request: $name', fixture => {
    const result = schemas[fixture.tool].safeParse(fixture.arguments);
    expect(result.success).toBe(true);
    if (result.success && fixture.expected !== undefined) expect(result.data).toEqual(fixture.expected);
  });

  it.each(fixtures.rejectedBoundaries)('preserves rejected boundary: $name', fixture => {
    expect(schemas[fixture.tool].safeParse(fixture.arguments).success).toBe(false);
  });
});

describe('reviewed v1.0.0 safety ceilings', () => {
  const recurringDate = (count: number) => ({
    type: 'recurring' as const,
    frequency: 'monthly' as const,
    start: '2026-01-01',
    interval: 1,
    patterns: Array.from({ length: count }, () => ({ type: 'day' as const, value: 1 }))
  });
  const conditions = (count: number) => Array.from(
    { length: count },
    () => ({ field: 'cleared' as const, op: 'is' as const, value: true })
  );
  const actions = (count: number) => Array.from(
    { length: count },
    () => ({ op: 'set' as const, field: 'cleared' as const, value: true })
  );
  const rule = (conditionCount: number, actionCount: number) => ({
    stage: 'default' as const,
    conditionsOp: 'and' as const,
    conditions: conditions(conditionCount),
    actions: actions(actionCount)
  });

  it('accepts each exact ceiling and rejects max plus one before runtime work', () => {
    const schedule = (count: number) => ({
      accountId: 'account-id',
      amount: { type: 'exact' as const, amount: 1 },
      date: recurringDate(count),
      postsTransaction: true
    });
    expect(createScheduleInputSchema.safeParse(schedule(MAX_SCHEDULE_PATTERNS)).success).toBe(true);
    expect(createScheduleInputSchema.safeParse(schedule(MAX_SCHEDULE_PATTERNS + 1)).success).toBe(false);
    expect(updateScheduleInputSchema.safeParse({ scheduleId: 'schedule-id', date: recurringDate(MAX_SCHEDULE_PATTERNS) }).success).toBe(true);
    expect(updateScheduleInputSchema.safeParse({ scheduleId: 'schedule-id', date: recurringDate(MAX_SCHEDULE_PATTERNS + 1) }).success).toBe(false);

    const merge = (count: number) => ({
      sourcePayeeIds: Array.from({ length: count }, (_, index) => `source-${index}`),
      targetPayeeId: 'target',
      confirmDestructive: true
    });
    expect(mergePayeesInputSchema.safeParse(merge(MAX_PAYEE_MERGE_SOURCES)).success).toBe(true);
    expect(mergePayeesInputSchema.safeParse(merge(MAX_PAYEE_MERGE_SOURCES + 1)).success).toBe(false);

    expect(createRuleInputSchema.safeParse(rule(MAX_RULE_CONDITIONS, MAX_RULE_ACTIONS)).success).toBe(true);
    expect(createRuleInputSchema.safeParse(rule(MAX_RULE_CONDITIONS + 1, 1)).success).toBe(false);
    expect(createRuleInputSchema.safeParse(rule(1, MAX_RULE_ACTIONS + 1)).success).toBe(false);
    expect(updateRuleInputSchema.safeParse({ ruleId: 'rule-id', conditions: conditions(MAX_RULE_CONDITIONS) }).success).toBe(true);
    expect(updateRuleInputSchema.safeParse({ ruleId: 'rule-id', conditions: conditions(MAX_RULE_CONDITIONS + 1) }).success).toBe(false);
    expect(updateRuleInputSchema.safeParse({ ruleId: 'rule-id', actions: actions(MAX_RULE_ACTIONS) }).success).toBe(true);
    expect(updateRuleInputSchema.safeParse({ ruleId: 'rule-id', actions: actions(MAX_RULE_ACTIONS + 1) }).success).toBe(false);

    const listCondition = (count: number) => ({
      field: 'account' as const,
      op: 'oneOf' as const,
      value: Array.from({ length: count }, (_, index) => `account-${index}`)
    });
    expect(createRuleInputSchema.safeParse({ ...rule(1, 1), conditions: [listCondition(MAX_RULE_LIST_VALUES)] }).success).toBe(true);
    expect(createRuleInputSchema.safeParse({ ...rule(1, 1), conditions: [listCondition(MAX_RULE_LIST_VALUES + 1)] }).success).toBe(false);
    expect(updateRuleInputSchema.safeParse({ ruleId: 'rule-id', conditions: [listCondition(MAX_RULE_LIST_VALUES)] }).success).toBe(true);
    expect(updateRuleInputSchema.safeParse({ ruleId: 'rule-id', conditions: [listCondition(MAX_RULE_LIST_VALUES + 1)] }).success).toBe(false);
  });
});
