import type { AdapterRule, AdapterRuleAction, AdapterRuleCondition } from './adapter.js';

export type PublicRuleStage = 'pre' | 'default' | 'post';

export interface PublicRuleCondition extends AdapterRuleCondition {}
export interface PublicRuleAction extends AdapterRuleAction {}
export interface PublicRule {
  id: string;
  stage: PublicRuleStage;
  conditionsOp: 'and' | 'or';
  conditions: PublicRuleCondition[];
  actions: PublicRuleAction[];
  writable: boolean;
  writeRestriction?: string;
}

export interface WritableRuleDraft {
  stage: PublicRuleStage;
  conditionsOp: 'and' | 'or';
  conditions: PublicRuleCondition[];
  actions: PublicRuleAction[];
}

const CONDITION_FIELDS = new Set([
  'account', 'category', 'category_group', 'amount', 'date', 'notes', 'payee', 'imported_payee',
  'saved', 'cleared', 'reconciled', 'transfer'
]);
const ID_FIELDS = new Set(['account', 'category', 'category_group', 'payee']);
const STRING_OPS = new Set(['is', 'isNot', 'contains', 'doesNotContain', 'matches']);
const LIST_OPS = new Set(['oneOf', 'notOneOf']);
const NUMBER_OPS = new Set(['is', 'isapprox', 'isbetween', 'gt', 'gte', 'lt', 'lte']);
const DATE_OPS = new Set(['is', 'isapprox', 'gt', 'gte', 'lt', 'lte']);
const ACTION_OPS = new Set(['set', 'set-split-amount', 'link-schedule', 'prepend-notes', 'append-notes', 'delete-transaction']);
const SET_FIELDS = new Set(['category', 'payee', 'notes', 'cleared', 'account', 'date', 'amount']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every(key => keys.includes(key));
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

export function fromSdkRuleStage(stage: AdapterRule['stage']): PublicRuleStage {
  if (stage === null) return 'default';
  if (stage === 'pre' || stage === 'post') return stage;
  throw new Error('Actual returned an unsupported rule stage.');
}

export function toSdkRuleStage(stage: PublicRuleStage): AdapterRule['stage'] {
  if (stage === 'default') return null;
  if (stage === 'pre' || stage === 'post') return stage;
  throw new Error('The requested rule stage is unsupported.');
}

function validateReadableCondition(condition: AdapterRuleCondition): void {
  if (!CONDITION_FIELDS.has(condition.field) || typeof condition.op !== 'string' || !Object.hasOwn(condition, 'value')) {
    throw new Error('Actual returned an unsupported rule condition.');
  }
}

function validateReadableAction(action: AdapterRuleAction): void {
  if (!ACTION_OPS.has(action.op) || !Object.hasOwn(action, 'value')) {
    throw new Error('Actual returned an unsupported rule action.');
  }
  if (action.op === 'set' && typeof action.field !== 'string') {
    throw new Error('Actual returned an incomplete set-rule action.');
  }
}

function optionsAreWritable(condition: AdapterRuleCondition): boolean {
  if (condition.options === undefined || condition.options === null) return true;
  if (!isRecord(condition.options)) return false;
  const allowed = condition.field === 'amount'
    ? ['inflow', 'outflow']
    : condition.field === 'date'
      ? ['month', 'year']
      : [];
  return hasOnlyKeys(condition.options, allowed) && Object.values(condition.options).every(value => typeof value === 'boolean');
}

function conditionValueIsWritable(condition: AdapterRuleCondition): boolean {
  const { field, op, value } = condition;
  if (ID_FIELDS.has(field)) {
    const allowedOps = field === 'account'
      ? new Set([...STRING_OPS, ...LIST_OPS, 'onBudget', 'offBudget'])
      : new Set([...STRING_OPS, ...LIST_OPS]);
    if (!allowedOps.has(op)) return false;
    if (LIST_OPS.has(op)) return Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item.length > 0);
    return typeof value === 'string' && value.length > 0;
  }
  if (field === 'imported_payee') {
    if (![...STRING_OPS, ...LIST_OPS].includes(op)) return false;
    if (LIST_OPS.has(op)) return Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item.length > 0);
    return typeof value === 'string' && value.length > 0;
  }
  if (field === 'notes') return [...STRING_OPS, 'hasTags', 'hasAnyTag'].includes(op) && typeof value === 'string' && value.length > 0;
  if (field === 'amount') {
    if (!NUMBER_OPS.has(op)) return false;
    if (op === 'isbetween') return isRecord(value) && hasOnlyKeys(value, ['num1', 'num2']) &&
      Number.isSafeInteger(value.num1) && Number.isSafeInteger(value.num2);
    return Number.isSafeInteger(value);
  }
  if (field === 'date') return DATE_OPS.has(op) && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (field === 'saved') return op === 'is' && typeof value === 'string';
  return ['cleared', 'reconciled', 'transfer'].includes(field) && op === 'is' && typeof value === 'boolean';
}

export function isWritableRuleCondition(condition: AdapterRuleCondition): boolean {
  return validateConditionMetadata(condition) && optionsAreWritable(condition) && conditionValueIsWritable(condition);
}

function validateConditionMetadata(condition: AdapterRuleCondition): boolean {
  if (condition.conditionsOp !== undefined || condition.customName !== undefined || condition.queryFilter !== undefined) return false;
  if (condition.type === undefined) return true;
  const expected = ID_FIELDS.has(condition.field)
    ? 'id'
    : condition.field === 'amount'
      ? 'number'
      : condition.field === 'date'
        ? 'date'
        : ['cleared', 'reconciled', 'transfer'].includes(condition.field)
          ? 'boolean'
          : 'string';
  return condition.type === expected;
}

export function isWritableRuleAction(action: AdapterRuleAction): boolean {
  if (action.op === 'prepend-notes' || action.op === 'append-notes') {
    return typeof action.value === 'string' && (action.options === undefined || action.options === null) &&
      (action.field === undefined || action.field === 'notes') && (action.type === undefined || action.type === 'id');
  }
  if (action.op !== 'set' || !action.field || !SET_FIELDS.has(action.field)) return false;
  if (action.options !== undefined && action.options !== null && Object.keys(action.options).length > 0) return false;
  switch (action.field) {
    case 'category':
    case 'payee':
    case 'account':
      return typeof action.value === 'string' && action.value.length > 0;
    case 'notes':
      return typeof action.value === 'string';
    case 'cleared':
      return typeof action.value === 'boolean';
    case 'date':
      return typeof action.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(action.value);
    case 'amount':
      return Number.isSafeInteger(action.value);
  }
  return false;
}

export function projectRule(rule: AdapterRule): PublicRule {
  if (!rule || typeof rule.id !== 'string' || !rule.id || !['and', 'or'].includes(rule.conditionsOp) ||
      !Array.isArray(rule.conditions) || !Array.isArray(rule.actions)) {
    throw new Error('Actual returned an incomplete rule shape.');
  }
  for (const condition of rule.conditions) validateReadableCondition(condition);
  for (const action of rule.actions) validateReadableAction(action);
  const writable = rule.conditions.length > 0 && rule.actions.length > 0 &&
    rule.conditions.every(isWritableRuleCondition) && rule.actions.every(isWritableRuleAction);
  return {
    id: rule.id,
    stage: fromSdkRuleStage(rule.stage),
    conditionsOp: rule.conditionsOp,
    conditions: cloneValue(rule.conditions),
    actions: cloneValue(rule.actions),
    writable,
    ...(writable ? {} : { writeRestriction: 'This rule contains semantics outside the MCP authoring subset.' })
  };
}

export function toSdkRule(rule: WritableRuleDraft, id?: string): AdapterRule {
  return {
    ...(id === undefined ? {} : { id }),
    stage: toSdkRuleStage(rule.stage),
    conditionsOp: rule.conditionsOp,
    conditions: cloneValue(rule.conditions),
    actions: cloneValue(rule.actions)
  } as AdapterRule;
}
