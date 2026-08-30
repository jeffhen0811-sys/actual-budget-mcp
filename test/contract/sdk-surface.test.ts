import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('@actual-app/api 26.8.1 exported structural surface', () => {
  it('keeps every required public declaration pinned and available', async () => {
    const manifest = JSON.parse(await readFile('node_modules/@actual-app/api/package.json', 'utf8')) as { version: string };
    const declarations = await readFile('node_modules/@actual-app/api/@types/methods.d.ts', 'utf8');
    const models = await readFile('node_modules/@actual-app/core/@types/src/server/api-models.d.ts', 'utf8');
    expect(manifest.version).toBe('26.8.1');
    for (const method of [
      'getBudgetMonths', 'getBudgetMonth', 'getTransactions', 'getAccounts', 'createAccount', 'updateAccount',
      'closeAccount', 'reopenAccount', 'deleteAccount', 'getAccountBalance', 'getCategoryGroups',
      'createCategoryGroup', 'updateCategoryGroup', 'deleteCategoryGroup', 'getCategories', 'createCategory',
      'updateCategory', 'deleteCategory'
    ]) expect(declarations).toContain(`function ${method}(`);
    expect(models).toContain('balance_current?: number | null');
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
  });
});
