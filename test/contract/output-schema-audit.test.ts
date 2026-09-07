import { describe, expect, it } from 'vitest';
import { TOOL_DEFINITIONS } from '../../src/mcp/tool-definitions.js';

type JsonSchema = boolean | Record<string, unknown>;

const forbiddenOutputNames = /password|credential|secret|token|apikey|syncid|encryptionpassword|datadir|filepath|stack|rawerror|internalerror/i;

function inspectSchema(
  schema: JsonSchema,
  path: string,
  inspect: (value: JsonSchema, path: string) => void
): void {
  inspect(schema, path);
  if (typeof schema === 'boolean') return;
  for (const [name, child] of Object.entries((schema.properties ?? {}) as Record<string, JsonSchema>)) {
    inspectSchema(child, `${path}.properties.${name}`, inspect);
  }
  for (const [name, child] of Object.entries((schema.$defs ?? {}) as Record<string, JsonSchema>)) {
    inspectSchema(child, `${path}.$defs.${name}`, inspect);
  }
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

describe('complete public output schema audit', () => {
  it('keeps all 62 success envelopes strict and free of credential or internal-state fields', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(62);
    for (const definition of TOOL_DEFINITIONS) {
      const root = definition.outputSchema['~standard'].jsonSchema.output({ target: 'draft-2020-12' }) as JsonSchema;
      expect(typeof root, definition.name).toBe('object');
      expect((root as Record<string, unknown>).type, definition.name).toBe('object');
      expect((root as Record<string, unknown>).additionalProperties, definition.name).toBe(false);
      inspectSchema(root, 'outputSchema', (value, path) => {
        const label = `${definition.name}:${path}`;
        expect(value, `${label} must not use boolean JSON Schema`).not.toBe(true);
        if (typeof value === 'boolean') return;
        const properties = (value.properties ?? {}) as Record<string, JsonSchema>;
        for (const name of Object.keys(properties)) expect(name, label).not.toMatch(forbiddenOutputNames);
        if (value.type === 'object' && value.additionalProperties !== false) {
          expect(definition.domain, label).toBe('rules');
          expect(path, label).toMatch(/\.properties\.queryFilter$/);
          expect(value.additionalProperties, label).toMatchObject({
            type: 'object',
            additionalProperties: false,
            required: ['$oneof']
          });
        }
      });
    }
  });

  it('allows unknown values only in the documented installed-rule read slots', () => {
    const unknownSlots: string[] = [];
    for (const definition of TOOL_DEFINITIONS) {
      const root = definition.outputSchema['~standard'].jsonSchema.output({ target: 'draft-2020-12' }) as JsonSchema;
      inspectSchema(root, 'outputSchema', (value, path) => {
        if (typeof value === 'boolean') return;
        const semanticKeys = Object.keys(value).filter(
          key => !['$schema', 'title', 'description', 'default', 'examples'].includes(key)
        );
        if (semanticKeys.length === 0) unknownSlots.push(`${definition.name}:${path}`);
      });
    }
    expect(unknownSlots).toHaveLength(8);
    for (const slot of unknownSlots) {
      expect(slot).toMatch(/^actual_(list_rules|get_rule|create_rule|update_rule):/);
      expect(slot).toMatch(/\.properties\.(conditions|actions).*\.properties\.value$/);
    }
  });
});
