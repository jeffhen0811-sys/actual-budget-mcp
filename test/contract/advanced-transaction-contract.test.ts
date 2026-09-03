import { readFile } from 'node:fs/promises';
import { aqlQuery, q } from '@actual-app/api';
import { describe, expect, it } from 'vitest';

describe('@actual-app/api 26.8.1 advanced transaction contract', () => {
  it('exports the public query builder and preferred executor', async () => {
    const declarations = await readFile('node_modules/@actual-app/api/@types/methods.d.ts', 'utf8');
    expect(typeof q).toBe('function');
    expect(typeof aqlQuery).toBe('function');
    expect(declarations).toContain("export { q } from './app/query'");
    expect(declarations).toContain('function aqlQuery(query: Query): Promise<unknown>');
    expect(declarations).toContain('@deprecated Please use `aqlQuery` instead.');
  });

  it('serializes fixed transaction filters, joins, deterministic order, and pagination', () => {
    const literal = String.raw`%100\% literal\? path\\value%`;
    const serialized = q('transactions')
      .filter({ $and: [
        { category: null },
        { payee: { $ne: null } },
        { id: { $oneof: ['transaction-a', 'transaction-b'] } },
        { amount: { $gte: -50_000, $lte: 25_000 } },
        { notes: { $like: literal } }
      ] })
      .select(['id', 'date', 'amount', 'payee.name', 'category.name'])
      .orderBy([{ date: 'desc' }, { amount: 'asc' }, { id: 'asc' }])
      .limit(100)
      .offset(25)
      .options({ splits: 'inline' })
      .serialize();

    expect(serialized).toMatchObject({
      table: 'transactions',
      tableOptions: { splits: 'inline' },
      filterExpressions: [{ $and: [
        { category: null },
        { payee: { $ne: null } },
        { id: { $oneof: ['transaction-a', 'transaction-b'] } },
        { amount: { $gte: -50_000, $lte: 25_000 } },
        { notes: { $like: literal } }
      ] }],
      selectExpressions: ['id', 'date', 'amount', 'payee.name', 'category.name'],
      orderExpressions: [{ date: 'desc' }, { amount: 'asc' }, { id: 'asc' }],
      limit: 100,
      offset: 25,
      calculation: false,
      rawMode: false,
      withDead: false,
      validateRefs: true
    });
  });

  it('serializes count, sum, and every installed transaction split shape used by the design', () => {
    const count = q('transactions').calculate({ $count: 'id' }).options({ splits: 'inline' }).serialize();
    const sum = q('transactions').calculate({ $sum: '$amount' }).options({ splits: 'inline' }).serialize();
    expect(count.selectExpressions).toEqual([{ result: { $count: 'id' } }]);
    expect(sum.selectExpressions).toEqual([{ result: { $sum: '$amount' } }]);
    for (const splits of ['inline', 'grouped', 'all'] as const) {
      expect(q('transactions').select('*').options({ splits }).serialize().tableOptions).toEqual({ splits });
    }
  });

  it('pins canonical null, transfer, starting-balance, split, nesting, and join declarations', async () => {
    const transaction = await readFile('node_modules/@actual-app/core/@types/src/types/models/transaction.d.ts', 'utf8');
    const schema = await readFile('node_modules/@actual-app/core/@types/src/server/aql/schema/index.d.ts', 'utf8');
    for (const field of [
      'is_parent?: boolean', 'is_child?: boolean', 'parent_id?:', 'subtransactions?: TransactionEntity[]',
      'starting_balance_flag?: boolean', 'transfer_id?:', 'imported_id?: string', 'imported_payee?: string'
    ]) expect(transaction).toContain(field);
    for (const field of ['is_parent:', 'is_child:', 'parent_id:', 'payee:', 'category:']) expect(schema).toContain(field);

    const implementation = await readFile('node_modules/@actual-app/api/dist/index.js', 'utf8');
    expect(implementation).toContain('payee: "pm.targetId"');
    expect(implementation).toContain('category: `CASE WHEN _.isParent = 1 THEN NULL ELSE cm.transferId END`');
    expect(implementation).toContain('parent_id: "CASE WHEN _.isChild = 0 THEN NULL ELSE _.parent_id END"');
    expect(implementation).toContain('subtransactions: childs.map(mapper)');
  });

  it('pins installed split execution, ordering, and aggregate behavior', async () => {
    const implementation = await readFile('node_modules/@actual-app/api/dist/index.js', 'utf8');
    expect(implementation).toContain('const splitType = tableOptions.splits ? tableOptions.splits : "inline"');
    expect(implementation).toContain('splitType === "all" || splitType === "inline" || splitType === "none"');
    expect(implementation).toContain('else if (splitType === "grouped")');
    expect(implementation).toContain('return orders.concat(["id"])');
    expect(implementation).toContain('s.where = `${s.where} AND ${s.from}.is_parent = 0`');
  });

  it('pins import options, preview evidence, reconciliation order, and the preview write guard', async () => {
    const options = await readFile('node_modules/@actual-app/core/@types/src/types/api-handlers.d.ts', 'utf8');
    const reconciliation = await readFile('node_modules/@actual-app/core/@types/src/server/accounts/sync.d.ts', 'utf8');
    const implementation = await readFile('node_modules/@actual-app/api/dist/index.js', 'utf8');
    expect(options).toContain('defaultCleared?: boolean');
    expect(options).toContain('dryRun?: boolean');
    expect(options).toContain('reimportDeleted?: boolean');
    expect(options).not.toContain('payeeNameNormalization');
    expect(reconciliation).toContain('updatedPreview: Array<{');
    expect(reconciliation).toContain('ignored?: boolean');
    expect(reconciliation).toContain('tombstone?: boolean');

    expect(implementation).toContain('const trans = await runRules$1(originalTrans, accountsMap)');
    expect(implementation).toContain('WHERE imported_id = ? AND account = ?');
    expect(implementation).toContain('payee_name = rawPayeeName ? trimmed : title(trimmed)');
    expect(implementation).toContain('if (match.reconciled)');
    expect(implementation).toContain('ignored: true');
    expect(implementation).toContain('id: v4()');
    expect(implementation).toContain('if (!isPreview) {');
    expect(implementation).toContain('await createNewPayees(payeesToCreate, [...added, ...updated])');
    expect(implementation).toContain('errors: [{ message: err.message }]');
    expect(implementation).toContain('isPreview: opts.dryRun');
  });
});
