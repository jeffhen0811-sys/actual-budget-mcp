import { describe, expect, it } from 'vitest';
import { TOOL_DEFINITIONS } from '../../src/mcp/tool-definitions.js';

type JsonSchema = boolean | Record<string, unknown>;

const forbiddenAuthorityNames = new Set([
  'query', 'queryfilter', 'rawquery', 'actualql', 'sql', 'sqlite', 'database', 'db', 'table', 'select',
  'where', 'path', 'filepath', 'directory', 'command', 'cmd', 'args', 'argv', 'environment', 'env',
  'transferid'
]);
const annotationOnlyKeys = new Set(['$schema', 'title', 'description', 'default', 'examples']);

function inspectSchema(
  schema: JsonSchema,
  path: string,
  inspect: (value: Record<string, unknown>, path: string) => void
): void {
  if (typeof schema === 'boolean') {
    expect(schema, `${path} must not be an unconstrained true schema`).toBe(false);
    return;
  }
  inspect(schema, path);
  const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
  for (const [name, child] of Object.entries(properties)) inspectSchema(child, `${path}.properties.${name}`, inspect);
  const definitions = (schema.$defs ?? {}) as Record<string, JsonSchema>;
  for (const [name, child] of Object.entries(definitions)) inspectSchema(child, `${path}.$defs.${name}`, inspect);
  for (const keyword of ['anyOf', 'oneOf', 'allOf', 'prefixItems'] as const) {
    const children = schema[keyword];
    if (Array.isArray(children)) {
      children.forEach((child, index) => inspectSchema(child as JsonSchema, `${path}.${keyword}[${index}]`, inspect));
    }
  }
  if (schema.items && typeof schema.items === 'object') inspectSchema(schema.items as JsonSchema, `${path}.items`, inspect);
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    inspectSchema(schema.additionalProperties as JsonSchema, `${path}.additionalProperties`, inspect);
  }
}

describe('mutation input authority boundary', () => {
  it('exposes no unconstrained schema, arbitrary record, or forbidden control field', () => {
    const mutations = TOOL_DEFINITIONS.filter(definition => definition.capability !== 'read');
    expect(mutations).toHaveLength(35);
    for (const definition of mutations) {
      const root = definition.inputSchema['~standard'].jsonSchema.input({ target: 'draft-2020-12' }) as JsonSchema;
      inspectSchema(root, 'inputSchema', (schema, path) => {
        const label = `${definition.name}:${path}`;
        const semanticKeys = Object.keys(schema).filter(key => !annotationOnlyKeys.has(key));
        expect(semanticKeys.length, `${label} must not accept any/unknown`).toBeGreaterThan(0);
        if (schema.type === 'object') expect(schema.additionalProperties, `${label} must be strict`).toBe(false);
        const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
        for (const name of Object.keys(properties)) {
          const normalized = name.toLowerCase().replaceAll('_', '');
          expect(forbiddenAuthorityNames.has(normalized), `${label}.${name} exposes forbidden caller authority`).toBe(false);
        }
      });
    }
  });

  it('keeps direct transfer linking and raw data access out of every mutation discovery schema', () => {
    for (const definition of TOOL_DEFINITIONS.filter(item => item.capability !== 'read')) {
      const schema = definition.inputSchema['~standard'].jsonSchema.input({ target: 'draft-2020-12' });
      const serialized = JSON.stringify(schema).toLowerCase();
      expect(serialized, definition.name).not.toContain('transfer_id');
      expect(serialized, definition.name).not.toContain('actualql');
      expect(serialized, definition.name).not.toContain('sqlite');
    }
  });
});
