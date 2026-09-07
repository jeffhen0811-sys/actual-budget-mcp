import { describe, expect, it } from 'vitest';
import type { z } from 'zod/v4';
import {
  accountSchema,
  budgetMonthOutputSchema,
  ruleSchema,
  scheduleSchema,
  transactionSchema
} from '../../src/mcp/contracts.js';

type Case = { area: string; schema: z.ZodType; value: unknown };

const transactionBase = { id: 'transaction-id', account: 'account-id', date: '2026-09-01', amount: -100 };
const budgetBase = {
  month: '2026-09',
  incomeAvailable: 0,
  lastMonthOverspent: 0,
  forNextMonth: 0,
  totalBudgeted: 0,
  toBudget: 0,
  fromLastMonth: 0,
  totalIncome: 0,
  totalSpent: 0,
  totalBalance: 0,
  capabilities: { holdForNextMonth: true, incomeBudgeting: false },
  categoryGroups: []
};

const accepted: Case[] = [
  {
    area: 'manual transaction preserves explicit nullable relationships',
    schema: transactionSchema,
    value: { ...transactionBase, payee: null, category: null, notes: null, imported_id: null, transfer_id: null }
  },
  {
    area: 'imported transaction preserves imported identity and nullable bank text',
    schema: transactionSchema,
    value: { ...transactionBase, imported_id: 'bank-row-1', imported_payee: null, notes: 'memo' }
  },
  {
    area: 'starting-balance transaction keeps its flag without fabricated relationships',
    schema: transactionSchema,
    value: { ...transactionBase, starting_balance_flag: true, payee: null, category: null }
  },
  {
    area: 'transfer transaction preserves reciprocal identity and null category',
    schema: transactionSchema,
    value: { ...transactionBase, transfer_id: 'counterpart-id', isTransfer: true, category: null }
  },
  {
    area: 'split parent and child preserve recursive optional and nullable fields',
    schema: transactionSchema,
    value: {
      ...transactionBase,
      is_parent: true,
      category: null,
      subtransactions: [{ ...transactionBase, id: 'child-id', is_child: true, parent_id: 'transaction-id', payee: null }]
    }
  },
  {
    area: 'account may omit both optional balance metadata fields',
    schema: accountSchema,
    value: { id: 'account-id', name: 'Account', offbudget: false, closed: false }
  },
  {
    area: 'account may expose zero balance or a sanitized balance error',
    schema: accountSchema,
    value: { id: 'account-id', name: 'Account', offbudget: false, closed: false, balance: 0, balanceError: 'Unavailable.' }
  },
  {
    area: 'schedule preserves explicit null amount, references, and recurrence',
    schema: scheduleSchema,
    value: {
      id: 'schedule-id', accountId: null, payeeId: null, amount: null, date: null, completed: false,
      postsTransaction: true, writable: false, unsupportedReasons: ['MISSING_AMOUNT']
    }
  },
  {
    area: 'schedule recurring date keeps absent optional next date and explicit recurrence end',
    schema: scheduleSchema,
    value: {
      id: 'schedule-id', accountId: 'account-id', payeeId: null, amount: { type: 'exact', amount: -100 },
      date: {
        type: 'recurring', frequency: 'monthly', start: '2026-09-01', interval: 1,
        patterns: [{ type: 'day', value: 1 }], weekend: 'none', end: { type: 'never' }
      },
      completed: false, postsTransaction: true, writable: true, unsupportedReasons: []
    }
  },
  {
    area: 'rule requires stage while preserving nullable installed options and absent metadata',
    schema: ruleSchema,
    value: {
      id: 'rule-id', stage: 'default', conditionsOp: 'and',
      conditions: [{ field: 'notes', op: 'is', value: null, options: null }],
      actions: [], writable: false
    }
  },
  {
    area: 'budget month allows optional group and category aggregates to remain absent',
    schema: budgetMonthOutputSchema,
    value: {
      ...budgetBase,
      categoryGroups: [{
        id: 'group-id', name: 'Group', isIncome: false, hidden: false,
        categories: [{
          id: 'category-id', name: 'Category', groupId: 'group-id', isIncome: false, hidden: false,
          capabilities: { budgetAmount: false, carryover: false }
        }]
      }]
    }
  }
];

const rejected: Case[] = [
  { area: 'transaction required account cannot be null', schema: transactionSchema, value: { ...transactionBase, account: null } },
  { area: 'transaction required date cannot be null', schema: transactionSchema, value: { ...transactionBase, date: null } },
  { area: 'account optional balance is absent-or-integer, not nullable', schema: accountSchema, value: { id: 'a', name: 'A', offbudget: false, closed: false, balance: null } },
  {
    area: 'schedule relationship keys are required even though their values may be null',
    schema: scheduleSchema,
    value: { id: 's', amount: null, date: null, completed: false, postsTransaction: false, writable: false, unsupportedReasons: [] }
  },
  { area: 'rule stage cannot be absent', schema: ruleSchema, value: { id: 'r', conditionsOp: 'and', conditions: [], actions: [], writable: true } },
  { area: 'rule optional restriction is absent-or-string, not nullable', schema: ruleSchema, value: { id: 'r', stage: 'pre', conditionsOp: 'and', conditions: [], actions: [], writable: true, writeRestriction: null } },
  {
    area: 'optional budget category aggregate is absent-or-integer, not nullable',
    schema: budgetMonthOutputSchema,
    value: {
      ...budgetBase,
      categoryGroups: [{
        id: 'g', name: 'G', isIncome: false, hidden: false,
        categories: [{ id: 'c', name: 'C', groupId: 'g', isIncome: false, hidden: false, budgeted: null, capabilities: { budgetAmount: true, carryover: true } }]
      }]
    }
  }
];

describe('v1 public nullability regression matrix', () => {
  it.each(accepted)('accepts $area', ({ schema, value }) => {
    expect(schema.safeParse(value).success).toBe(true);
  });

  it.each(rejected)('rejects $area', ({ schema, value }) => {
    expect(schema.safeParse(value).success).toBe(false);
  });
});
