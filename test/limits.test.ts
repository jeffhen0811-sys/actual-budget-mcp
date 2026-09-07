import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  copyBudgetInputSchema,
  createScheduleInputSchema,
  findPossibleTransfersInputSchema,
  rangeSummaryInputSchema
} from '../src/mcp/contracts.js';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';
import {
  DEFAULT_BUDGET_COPY_DIFFERENCE_RESULTS,
  DEFAULT_DIAGNOSTIC_WINDOW_DAYS,
  LEDGER_QUERY_SENTINEL_LIMIT,
  MAX_BUDGET_COPY_CHANGES,
  MAX_BUDGET_COPY_DIFFERENCE_RESULTS,
  MAX_DIAGNOSTIC_WINDOW_DAYS,
  MAX_LEDGER_SCAN_RESULTS,
  MAX_SCHEDULE_PATTERNS,
  MAX_SUMMARY_SCOPE_IDS,
  PUBLIC_LIMIT_CATALOG
} from '../src/schemas.js';

describe('central public limits', () => {
  it('uses a one-row ledger sentinel and named schema defaults and maxima', () => {
    expect(LEDGER_QUERY_SENTINEL_LIMIT).toBe(MAX_LEDGER_SCAN_RESULTS + 1);
    expect(findPossibleTransfersInputSchema.parse({
      startDate: '2026-09-01', endDate: '2026-09-01'
    })).toMatchObject({ dateWindowDays: DEFAULT_DIAGNOSTIC_WINDOW_DAYS });
    expect(() => findPossibleTransfersInputSchema.parse({
      startDate: '2026-09-01', endDate: '2026-09-01', dateWindowDays: MAX_DIAGNOSTIC_WINDOW_DAYS + 1
    })).toThrow();
    expect(() => rangeSummaryInputSchema.parse({
      startDate: '2026-09-01', endDate: '2026-09-01', accountIds: Array.from({ length: MAX_SUMMARY_SCOPE_IDS + 1 }, (_, index) => `a-${index}`)
    })).toThrow();
    expect(() => createScheduleInputSchema.parse({
      accountId: 'a', amount: { type: 'exact', amount: 1 }, postsTransaction: true,
      date: {
        type: 'recurring', frequency: 'monthly', start: '2026-09-01', interval: 1,
        patterns: Array.from({ length: MAX_SCHEDULE_PATTERNS + 1 }, () => ({ type: 'day', value: 1 }))
      }
    })).toThrow();
    expect(copyBudgetInputSchema.parse({ sourceMonth: '2026-08', targetMonth: '2026-09' })).toMatchObject({
      differenceLimit: DEFAULT_BUDGET_COPY_DIFFERENCE_RESULTS,
      maxChanges: MAX_BUDGET_COPY_CHANGES
    });
    expect(() => copyBudgetInputSchema.parse({
      sourceMonth: '2026-08', targetMonth: '2026-09', differenceLimit: MAX_BUDGET_COPY_DIFFERENCE_RESULTS + 1
    })).toThrow();
  });

  it('keeps tool metadata and generated documentation within the exhaustive catalog', async () => {
    const names = new Set(Object.keys(PUBLIC_LIMIT_CATALOG));
    for (const definition of TOOL_DEFINITIONS) {
      expect(definition.bounds.every(bound => names.has(bound)), definition.name).toBe(true);
    }
    const documentation = await readFile('docs/limits-v1.md', 'utf8');
    for (const name of names) expect(documentation, name).toContain(`| \`${name}\` |`);
  });

  it('contains no remaining ledger, diagnostic, or budget-copy numeric magic in implementation sources', async () => {
    const sources = await Promise.all([
      'src/actual/client.ts', 'src/actual/schedules.ts', 'src/actual/summaries.ts',
      'src/actual/transactions.ts', 'src/mcp/contracts.ts'
    ].map(path => readFile(path, 'utf8')));
    const implementation = sources.join('\n');
    expect(implementation).not.toMatch(/\.limit\((?:5001|5_001|2)\)/);
    expect(implementation).not.toMatch(/\.max\((?:7|250|500)\)\.default\((?:3|100|500)\)/);
    expect(implementation).not.toMatch(/(?:rows|transactions)\.length > (?:5000|5_000)/);
  });
});
