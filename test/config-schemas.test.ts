import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig, sanitizeServerUrl } from '../src/config.js';
import { batchSchema, budgetMonthSchema, dateRangeSchema, integerAmountSchema, isoDateSchema, opaqueIdSchema, positiveIntegerAmountSchema } from '../src/schemas.js';
import {
  createAccountInputSchema,
  createCategoryInputSchema,
  copyBudgetInputSchema,
  deleteAccountInputSchema,
  deleteCategoryGroupInputSchema,
  deleteCategoryInputSchema,
  updateAccountInputSchema
} from '../src/mcp/contracts.js';
import { z } from 'zod/v4';

const temporaryDirectories: string[] = [];
afterEach(async () => Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

describe('configuration', () => {
  it('loads required values and creates the configured cache directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'actual-config-'));
    temporaryDirectories.push(root);
    const dataDir = join(root, 'cache');
    await expect(loadConfig({
      ACTUAL_SERVER_URL: 'http://actual.example:5006', ACTUAL_PASSWORD: 'sentinel-password', ACTUAL_SYNC_ID: 'budget-id', ACTUAL_DATA_DIR: dataDir
    })).resolves.toMatchObject({ serverUrl: 'http://actual.example:5006', password: 'sentinel-password', syncId: 'budget-id', dataDir });
  });

  it('names missing fields without exposing other secret values', async () => {
    await expect(loadConfig({ ACTUAL_SERVER_URL: 'http://actual.example', ACTUAL_PASSWORD: 'do-not-leak' })).rejects.toSatisfy(error => {
      const text = String(error);
      return text.includes('ACTUAL_SYNC_ID') && !text.includes('do-not-leak');
    });
  });

  it('uses the documented default data directory', async () => {
    const result = await loadConfig({ ACTUAL_SERVER_URL: 'http://actual.example', ACTUAL_PASSWORD: 'secret', ACTUAL_SYNC_ID: 'budget' });
    expect(result.dataDir).toBe('/tmp/actual-budget-mcp');
  });

  it('removes URL credentials from health output', () => {
    expect(sanitizeServerUrl('http://user:password@actual.example:5006/')).toBe('http://actual.example:5006');
  });
});

describe('shared schemas', () => {
  it('accepts opaque non-UUID identifiers and integer minor-unit amounts', () => {
    expect(opaqueIdSchema.parse('account-legacy/42')).toBe('account-legacy/42');
    expect(integerAmountSchema.parse(-12345)).toBe(-12345);
    expect(() => integerAmountSchema.parse(12.34)).toThrow('integer in minor units');
  });

  it('validates real calendar dates', () => {
    expect(isoDateSchema.parse('2024-02-29')).toBe('2024-02-29');
    expect(() => isoDateSchema.parse('2025-02-29')).toThrow('valid calendar date');
  });

  it('validates strict calendar months, positive holds, and safe budget-copy defaults and bounds', () => {
    expect(budgetMonthSchema.parse('2026-09')).toBe('2026-09');
    for (const invalid of ['2026-9', '2026-13', '2026-09-01', 'September 2026']) {
      expect(() => budgetMonthSchema.parse(invalid)).toThrow('YYYY-MM');
    }
    expect(positiveIntegerAmountSchema.parse(1)).toBe(1);
    for (const invalid of [0, -1, 1.5]) expect(() => positiveIntegerAmountSchema.parse(invalid)).toThrow();
    expect(copyBudgetInputSchema.parse({ sourceMonth: '2026-08', targetMonth: '2026-09' })).toEqual({
      sourceMonth: '2026-08', targetMonth: '2026-09', dryRun: true, mode: 'fill-empty', includeCarryover: false,
      includeHidden: false, confirmOverwrite: false, differenceLimit: 100, maxChanges: 500
    });
    expect(() => copyBudgetInputSchema.parse({ sourceMonth: '2026-08', targetMonth: '2026-08' })).toThrow('different');
    expect(() => copyBudgetInputSchema.parse({ sourceMonth: '2026-08', targetMonth: '2026-09', maxChanges: 501 })).toThrow('500');
    expect(() => copyBudgetInputSchema.parse({ sourceMonth: '2026-08', targetMonth: '2026-09', unknown: true })).toThrow();
  });

  it('rejects reversed and longer-than-366-day ranges', () => {
    expect(() => dateRangeSchema.parse({ startDate: '2026-02-02', endDate: '2026-02-01' })).toThrow('on or after');
    expect(() => dateRangeSchema.parse({ startDate: '2024-01-01', endDate: '2025-01-01' })).toThrow('366 days');
  });

  it('limits import batches to 500 items', () => {
    const schema = batchSchema(z.number());
    expect(schema.parse(Array.from({ length: 500 }, (_, index) => index))).toHaveLength(500);
    expect(() => schema.parse(Array.from({ length: 501 }, (_, index) => index))).toThrow('500 transactions');
  });

  it('trims structural names, keeps signed balances, and rejects invalid or extra fields', () => {
    expect(createAccountInputSchema.parse({ name: '  Savings  ', initialBalance: -12030 })).toEqual({
      name: 'Savings', offbudget: false, initialBalance: -12030
    });
    expect(() => createAccountInputSchema.parse({ name: '   ' })).toThrow('must not be empty');
    expect(() => createAccountInputSchema.parse({ name: 'x'.repeat(256) })).toThrow('255');
    expect(() => updateAccountInputSchema.parse({ accountId: 'a' })).toThrow('permitted update');
    expect(() => updateAccountInputSchema.parse({ accountId: 'a', closed: true })).toThrow();
    expect(() => createCategoryInputSchema.parse({ name: 'Food', groupId: 'g', hidden: true })).toThrow();
  });

  it('requires literal destructive confirmation for all structural deletes', () => {
    for (const [schema, id] of [
      [deleteAccountInputSchema, { accountId: 'a' }],
      [deleteCategoryGroupInputSchema, { groupId: 'g' }],
      [deleteCategoryInputSchema, { categoryId: 'c' }]
    ] as const) {
      expect(() => schema.parse(id)).toThrow('confirmDestructive');
      expect(() => schema.parse({ ...id, confirmDestructive: false })).toThrow('confirmDestructive');
      expect(schema.parse({ ...id, confirmDestructive: true })).toMatchObject({ confirmDestructive: true });
    }
  });
});
