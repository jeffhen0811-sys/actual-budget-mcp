import { describe, expect, it } from 'vitest';
import {
  checkContractCompatibility,
  type ReviewedInputLimit,
  type ToolContract,
  type ToolContractSnapshot
} from '../../src/mcp/contract-compatibility.js';

function tool(): ToolContract {
  return {
    name: 'actual_get_example',
    title: 'Get example',
    description: 'Read one example.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 10 },
        mode: { type: 'string', enum: ['one', 'two'] },
        ids: { type: 'array', items: { type: 'string' } }
      },
      required: ['id']
    },
    outputSchema: {
      $defs: {
        example: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            value: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          },
          required: ['id', 'value']
        }
      },
      type: 'object',
      additionalProperties: false,
      properties: { example: { $ref: '#/$defs/example' } },
      required: ['example']
    }
  };
}

function snapshot(contract: ToolContract = tool()): ToolContractSnapshot {
  return {
    baselineVersion: '0.7.0',
    formatVersion: 1,
    sourceCommit: 'c5b752a5f7f3067a40480f72078907c72ad26c66',
    toolCount: 1,
    tools: [contract]
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

describe('v0.7.0 semantic compatibility', () => {
  it('accepts the frozen contract and input relaxations', () => {
    const current = clone(tool());
    const input = current.inputSchema as Exclude<typeof current.inputSchema, boolean>;
    input.required = [];
    input.properties!.id = { type: 'string', minLength: 0, maxLength: 20 };
    expect(checkContractCompatibility(snapshot(), [current])).toEqual([]);
  });

  it('compares dereferenced output schemas instead of definition names or ordering', () => {
    const current = clone(tool());
    const output = current.outputSchema as Exclude<typeof current.outputSchema, boolean>;
    const definition = output.$defs!.example!;
    output.$defs = { renamed: definition };
    output.properties = { example: { $ref: '#/$defs/renamed' } };
    (definition as Exclude<typeof definition, boolean>).required = ['value', 'id'];
    expect(checkContractCompatibility(snapshot(), [current])).toEqual([]);
  });

  it('rejects name, count, and annotation drift', () => {
    const renamed = clone(tool());
    renamed.name = 'actual_get_renamed';
    expect(checkContractCompatibility(snapshot(), [renamed]).map(issue => issue.area)).toContain('inventory');

    const changedAnnotation = clone(tool());
    changedAnnotation.annotations!.readOnlyHint = false;
    expect(checkContractCompatibility(snapshot(), [changedAnnotation])).toContainEqual(
      expect.objectContaining({ tool: 'actual_get_example', area: 'annotations' })
    );
  });

  it('rejects newly required inputs and tightened bounds or enums', () => {
    const required = clone(tool());
    (required.inputSchema as Exclude<typeof required.inputSchema, boolean>).required = ['id', 'mode'];
    expect(checkContractCompatibility(snapshot(), [required])).toContainEqual(
      expect.objectContaining({ area: 'input', message: expect.stringContaining('required adds mode') })
    );

    const bounded = clone(tool());
    (bounded.inputSchema as Exclude<typeof bounded.inputSchema, boolean>).properties!.id = {
      type: 'string', minLength: 2, maxLength: 9
    };
    expect(checkContractCompatibility(snapshot(), [bounded])).toContainEqual(
      expect.objectContaining({ area: 'input', message: expect.stringContaining('minLength') })
    );

    const narrowedEnum = clone(tool());
    (narrowedEnum.inputSchema as Exclude<typeof narrowedEnum.inputSchema, boolean>).properties!.mode = {
      type: 'string', enum: ['one']
    };
    expect(checkContractCompatibility(snapshot(), [narrowedEnum])).toContainEqual(
      expect.objectContaining({ area: 'input', message: expect.stringContaining('enum') })
    );
  });

  it('accepts only the exact reviewed limit for a previously unbounded array', () => {
    const reviewedLimit: ReviewedInputLimit = {
      tool: 'actual_get_example',
      path: '/properties/ids',
      maxItems: 5
    };
    const current = clone(tool());
    ((current.inputSchema as Exclude<typeof current.inputSchema, boolean>).properties!.ids as Record<string, unknown>)
      .maxItems = 5;

    expect(checkContractCompatibility(snapshot(), [current])).toContainEqual(
      expect.objectContaining({ area: 'input', message: expect.stringContaining('maxItems') })
    );
    expect(checkContractCompatibility(snapshot(), [current], { reviewedInputLimits: [reviewedLimit] })).toEqual([]);

    ((current.inputSchema as Exclude<typeof current.inputSchema, boolean>).properties!.ids as Record<string, unknown>)
      .maxItems = 4;
    expect(checkContractCompatibility(snapshot(), [current], { reviewedInputLimits: [reviewedLimit] })).toContainEqual(
      expect.objectContaining({ area: 'input', message: expect.stringContaining('reviewed maxItems value 5') })
    );
  });

  it('rejects stale or invalid reviewed input exceptions', () => {
    const current = clone(tool());
    expect(checkContractCompatibility(snapshot(), [current], {
      reviewedInputLimits: [{ tool: current.name, path: '/properties/id', maxItems: 5 }]
    })).toContainEqual(expect.objectContaining({
      area: 'input',
      message: expect.stringContaining('unbounded array in the frozen baseline')
    }));
  });

  it('rejects removed output fields, wrapper changes, types, and nullability', () => {
    const removed = clone(tool());
    const removedDefinition = (removed.outputSchema as Exclude<typeof removed.outputSchema, boolean>).$defs!.example as {
      properties: Record<string, unknown>;
      required: string[];
    };
    delete removedDefinition.properties.id;
    removedDefinition.required = ['value'];
    expect(checkContractCompatibility(snapshot(), [removed])).toContainEqual(
      expect.objectContaining({ area: 'output' })
    );

    const changedWrapper = clone(tool());
    changedWrapper.outputSchema = { type: 'array', items: { type: 'object' } };
    expect(checkContractCompatibility(snapshot(), [changedWrapper])).toContainEqual(
      expect.objectContaining({ area: 'output', message: expect.stringContaining('outputSchema') })
    );

    const changedNullability = clone(tool());
    const nullableDefinition = (changedNullability.outputSchema as Exclude<typeof changedNullability.outputSchema, boolean>)
      .$defs!.example as { properties: Record<string, unknown> };
    nullableDefinition.properties.value = { type: 'string' };
    expect(checkContractCompatibility(snapshot(), [changedNullability])).toContainEqual(
      expect.objectContaining({ area: 'output' })
    );
  });
});
