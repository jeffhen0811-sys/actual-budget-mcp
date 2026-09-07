import { describe, expect, it } from 'vitest';
import { TOOL_DEFINITIONS } from '../../src/mcp/tool-definitions.js';

type JsonObject = Record<string, unknown>;

function inputSchema(definition: (typeof TOOL_DEFINITIONS)[number]): JsonObject {
  return definition.inputSchema['~standard'].jsonSchema.input({ target: 'draft-2020-12' }) as JsonObject;
}

function visit(node: unknown, path: string, inspect: (schema: JsonObject, path: string) => void): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((value, index) => visit(value, `${path}[${index}]`, inspect));
    return;
  }
  const schema = node as JsonObject;
  inspect(schema, path);
  for (const [key, value] of Object.entries(schema)) visit(value, `${path}.${key}`, inspect);
}

function isIntentionalFormatString(path: string): boolean {
  const property = path.match(/\.properties\.([^.[]+)$/)?.[1];
  if (['date', 'start', 'startDate', 'endDate', 'month', 'sourceMonth', 'targetMonth', 'cutoff'].includes(property ?? '')) {
    return true;
  }
  if (property === 'expectedPreviewFingerprint') return true;
  return /\.properties\.(conditions|actions)\.items\.anyOf\[(7|3)]\.properties\.value$/.test(path);
}

describe('complete public input schema audit', () => {
  it('keeps every object strict, every caller array bounded, and every number a bounded integer', () => {
    for (const definition of TOOL_DEFINITIONS) {
      const root = inputSchema(definition);
      expect(root.type, definition.name).toBe('object');
      expect(root.additionalProperties, definition.name).toBe(false);
      visit(root, 'inputSchema', (schema, path) => {
        const label = `${definition.name}:${path}`;
        if (schema.type === 'object') expect(schema.additionalProperties, label).toBe(false);
        if (schema.type === 'array') {
          expect(schema.maxItems, label).toEqual(expect.any(Number));
          expect(Number.isSafeInteger(schema.maxItems), label).toBe(true);
          expect(schema.maxItems as number, label).toBeGreaterThan(0);
        }
        if (schema.type === 'number' || schema.type === 'integer') {
          expect(schema.type, label).toBe('integer');
          const lower = (schema.minimum ?? schema.exclusiveMinimum) as number | undefined;
          const upper = (schema.maximum ?? schema.exclusiveMaximum) as number | undefined;
          expect(lower, label).toEqual(expect.any(Number));
          expect(upper, label).toEqual(expect.any(Number));
          expect(lower!, label).toBeGreaterThanOrEqual(Number.MIN_SAFE_INTEGER);
          expect(upper!, label).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
        }
        if (schema.type === 'string' && schema.maxLength === undefined && schema.enum === undefined && schema.const === undefined) {
          expect(isIntentionalFormatString(path), label).toBe(true);
        }
      });
    }
  });

  it('advertises conservative dry-run defaults and literal destructive consent', () => {
    for (const definition of TOOL_DEFINITIONS) {
      const schema = inputSchema(definition);
      const properties = (schema.properties ?? {}) as Record<string, JsonObject>;
      if (definition.confirmation === 'confirm-write') {
        expect(properties.dryRun?.default, definition.name).toBe(true);
        expect(properties.confirmWrite?.type, definition.name).toBe('boolean');
      }
      if (definition.confirmation === 'budget-copy') {
        expect(properties.dryRun?.default, definition.name).toBe(true);
        expect(properties.confirmOverwrite?.default, definition.name).toBe(false);
      }
      if (definition.confirmation === 'confirm-destructive') {
        expect(properties.confirmDestructive, definition.name).toMatchObject({ type: 'boolean', const: true });
      }
    }
  });
});
