import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('@actual-app/api 26.8.1 exported structural surface', () => {
  it('keeps every required public declaration pinned and available', async () => {
    const manifest = JSON.parse(await readFile('node_modules/@actual-app/api/package.json', 'utf8')) as { version: string };
    const declarations = await readFile('node_modules/@actual-app/api/@types/methods.d.ts', 'utf8');
    const models = await readFile('node_modules/@actual-app/core/@types/src/server/api-models.d.ts', 'utf8');
    const ruleModels = await readFile('node_modules/@actual-app/core/@types/src/types/models/rule.d.ts', 'utf8');
    expect(manifest.version).toBe('26.8.1');
    for (const method of [
      'getBudgetMonths', 'getBudgetMonth', 'getTransactions', 'getAccounts', 'createAccount', 'updateAccount',
      'closeAccount', 'reopenAccount', 'deleteAccount', 'getAccountBalance', 'getCategoryGroups',
      'createCategoryGroup', 'updateCategoryGroup', 'deleteCategoryGroup', 'getCategories', 'createCategory',
      'updateCategory', 'deleteCategory', 'getPayees', 'createPayee', 'updatePayee', 'deletePayee',
      'mergePayees', 'getPayeeRules', 'getRules', 'createRule', 'updateRule', 'deleteRule',
      'setBudgetAmount', 'setBudgetCarryover', 'holdBudgetForNextMonth', 'resetBudgetHold', 'batchBudgetUpdates'
    ]) expect(declarations).toContain(`function ${method}(`);
    expect(models).toContain('balance_current?: number | null');
    expect(models).toContain("Pick<PayeeEntity, 'id' | 'name' | 'transfer_acct'>");
    expect(declarations).toContain("updateRule(rule: RuleEntity)");
    expect(declarations).toContain("deleteRule(id: RuleEntity['id']): Promise<boolean>");
    expect(ruleModels).toContain("stage: 'pre' | null | 'post'");
    expect(ruleModels).toContain('conditions: RuleConditionEntity[]');
    expect(ruleModels).toContain('actions: RuleActionEntity[]');
    expect(ruleModels).toContain('options?:');
    expect(ruleModels).toContain('tombstone?: boolean');
    expect(declarations).not.toMatch(/function (?:runRules|previewRule)\(/);
    for (const aggregate of [
      'incomeAvailable', 'lastMonthOverspent', 'forNextMonth', 'totalBudgeted', 'toBudget',
      'fromLastMonth', 'totalIncome', 'totalSpent', 'totalBalance'
    ]) expect(declarations).toContain(`${aggregate}: number`);
  });

  it('retains the public unbounded history behavior and known cascade guards', async () => {
    const implementation = await readFile('node_modules/@actual-app/api/dist/index.js', 'utf8');
    expect(implementation).toContain('startDate && { date: { $gte: startDate } }');
    expect(implementation).toContain('endDate && { date: { $lte: endDate } }');
    expect(implementation).toContain('if (numTransactions === 0) await deleteAccount$1({ id })');
    expect(implementation).toContain('categories.map((cat) => deleteCategory$2(cat, transferId))');
    expect(implementation).toContain('name: group.name,\n\t\thidden: group.hidden');
    expect(implementation).toContain('name: category.name.trim()');
    expect(implementation).toContain('group.name.toUpperCase()');
    expect(implementation).toContain('if (isTrackingBudget()) return {');
    expect(implementation).toContain('budgeted: value(`budget-${cat.id}`)');
    expect(implementation).toContain('received: value(`sum-amount-${cat.id}`)');
    expect(implementation).toContain('spent: value(`sum-amount-${cat.id}`)');
    expect(implementation).toContain('startMonth: month');
    expect(implementation).toContain('if (amount <= 0) throw APIError("Amount to hold needs to be greater than 0")');
    expect(implementation).toContain('await send("api/batch-budget-start")');
    expect(implementation).toContain('await send("api/batch-budget-end")');
  });

  it('pins payee merge and rule safety behavior without importing bundle internals in production', async () => {
    const implementation = await readFile('node_modules/@actual-app/api/dist/index.js', 'utf8');
    expect(implementation).toContain('if (transfer_acct) return;');
    expect(implementation).toContain('if (payees[target].transfer_acct != null) return;');
    expect(implementation).toContain('ids = ids.filter((id) => payees[id].transfer_acct == null);');
    expect(implementation).toContain('SELECT id FROM payee_mapping WHERE targetId = ?');
    expect(implementation).toContain('targetId: target');
    expect(implementation).toContain('if (rule.stage !== "pre" && rule.stage !== "post" && rule.stage !== null)');
    expect(implementation).toContain('return pre.concat(normal).concat(post);');
    expect(implementation).toContain('SELECT id FROM schedules WHERE rule = ?');
    expect(implementation).toContain('return handlers$1["rule-delete"](id);');
  });

  it('does not publicly export bundled single-rule, run, or preview handlers', async () => {
    const implementation = await readFile('node_modules/@actual-app/api/dist/index.js', 'utf8');
    const exportBlock = implementation.slice(implementation.lastIndexOf('//#region index.ts'));
    expect(implementation).toContain('app$5.method("rule-get", getRule);');
    expect(implementation).toContain('app$5.method("rules-run", runRules);');
    expect(exportBlock).not.toMatch(/exports\.(?:runRules|previewRule|getRule)\s*=/);
    expect(exportBlock).not.toMatch(/exports\.[A-Za-z]*[Pp]review[A-Za-z]*\s*=/);
  });
});
