import { describe, expect, it } from 'vitest';
import { TOOL_DEFINITIONS } from '../../src/mcp/tool-definitions.js';
import { successResult } from '../../src/mcp/response.js';

type JsonSchema = boolean | Record<string, unknown>;

function resolve(root: JsonSchema, reference: string): JsonSchema {
  expect(reference).toMatch(/^#\//);
  return reference.slice(2).split('/').reduce<unknown>((value, part) => {
    const key = part.replaceAll('~1', '/').replaceAll('~0', '~');
    return (value as Record<string, unknown>)[key];
  }, root) as JsonSchema;
}

function stringFixture(schema: Record<string, unknown>, path: string): string {
  if (schema.format === 'date-time' || /(?:At|Timestamp)$/.test(path)) return '2026-09-01T00:00:00.000Z';
  if (schema.pattern === '^v1:[a-f0-9]{64}$') return `v1:${'a'.repeat(64)}`;
  const property = path.match(/\.properties\.([^.[]+)$/)?.[1] ?? '';
  if (/(?:^|_)(?:date)$|Date$/.test(property) || property === 'start' || property === 'cutoff') return '2026-09-01';
  if (/Month$/.test(property) || property === 'month') return '2026-09';
  const minimum = typeof schema.minLength === 'number' ? schema.minLength : 1;
  return 'x'.repeat(Math.max(1, minimum));
}

function fixtureFor(schema: JsonSchema, root: JsonSchema, path = 'outputSchema', refDepth = 0): unknown {
  if (schema === false) throw new Error(`${path} rejects all values.`);
  if (schema === true) return null;
  if (typeof schema.$ref === 'string') {
    if (refDepth > 8) return undefined;
    return fixtureFor(resolve(root, schema.$ref), root, path, refDepth + 1);
  }
  if (Object.hasOwn(schema, 'const')) return schema.const;
  if (Array.isArray(schema.enum)) return schema.enum[0];
  const alternatives = (schema.anyOf ?? schema.oneOf) as JsonSchema[] | undefined;
  if (alternatives) return fixtureFor(alternatives[0]!, root, `${path}.variant[0]`, refDepth);

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const type = types.find(candidate => candidate !== 'null') ?? types[0];
  if (type === 'null') return null;
  if (type === 'string') return stringFixture(schema, path);
  if (type === 'boolean') return false;
  if (type === 'integer' || type === 'number') {
    const inclusive = typeof schema.minimum === 'number' ? schema.minimum : undefined;
    const exclusive = typeof schema.exclusiveMinimum === 'number' ? schema.exclusiveMinimum : undefined;
    const positiveByRefinement = /\.properties\.(?:magnitude|requestedAmount)(?:\.|$)/.test(path) ? 1 : 0;
    const value = positiveByRefinement > 0
      ? positiveByRefinement
      : (exclusive === undefined ? (inclusive ?? 0) : exclusive + 1);
    return type === 'integer' ? Math.ceil(value) : value;
  }
  if (type === 'array') {
    const prefixItems = Array.isArray(schema.prefixItems) ? schema.prefixItems as JsonSchema[] : [];
    const count = Math.max(typeof schema.minItems === 'number' ? schema.minItems : 0, prefixItems.length);
    return Array.from({ length: count }, (_, index) => fixtureFor(
      (prefixItems[index] ?? schema.items ?? true) as JsonSchema,
      root,
      `${path}.items[${index}]`,
      refDepth
    ));
  }
  if (type === 'object' || schema.properties) {
    const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
    return Object.fromEntries((schema.required as string[] | undefined ?? []).map(name => [
      name,
      fixtureFor(properties[name]!, root, `${path}.properties.${name}`, refDepth)
    ]));
  }
  return null;
}

describe('generated success response contracts', () => {
  it.each(TOOL_DEFINITIONS)('$name returns equivalent schema-valid structured and JSON text content', async definition => {
    const jsonSchema = definition.outputSchema['~standard'].jsonSchema.output({ target: 'draft-2020-12' }) as JsonSchema;
    const fixture = fixtureFor(jsonSchema, jsonSchema) as Record<string, unknown>;
    const fixtureValidation = await definition.outputSchema['~standard'].validate(fixture);
    expect(fixtureValidation.issues, definition.name).toBeUndefined();

    const result = successResult(fixture);
    expect(result.isError, definition.name).not.toBe(true);
    expect(result.content, definition.name).toHaveLength(1);
    expect(result.content[0], definition.name).toMatchObject({ type: 'text' });
    const textual = JSON.parse((result.content[0] as { text: string }).text) as unknown;
    expect(textual, definition.name).toEqual(result.structuredContent);

    const structuredValidation = await definition.outputSchema['~standard'].validate(result.structuredContent);
    const textualValidation = await definition.outputSchema['~standard'].validate(textual);
    expect(structuredValidation.issues, definition.name).toBeUndefined();
    expect(textualValidation.issues, definition.name).toBeUndefined();
  });
});
