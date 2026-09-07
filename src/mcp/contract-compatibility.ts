export type JsonSchema = boolean | {
  [key: string]: unknown;
  $defs?: Record<string, JsonSchema>;
  $ref?: string;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  prefixItems?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
};

export interface ToolContract {
  name: string;
  title?: string;
  description?: string;
  annotations?: Record<string, unknown>;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
}

export interface ToolContractSnapshot {
  baselineVersion: string;
  formatVersion: number;
  sourceCommit: string;
  toolCount: number;
  tools: ToolContract[];
}

export interface ReviewedInputLimit {
  tool: string;
  path: string;
  maxItems: number;
}

export interface ContractCompatibilityOptions {
  reviewedInputLimits?: readonly ReviewedInputLimit[];
}

export interface CompatibilityIssue {
  tool?: string;
  area: 'inventory' | 'metadata' | 'annotations' | 'input' | 'output';
  path: string;
  message: string;
}

type SchemaObject = Exclude<JsonSchema, boolean>;

function isObjectSchema(schema: unknown): schema is SchemaObject {
  return typeof schema === 'object' && schema !== null;
}

function decodePointerPart(value: string): string {
  return value.replaceAll('~1', '/').replaceAll('~0', '~');
}

function valueAtPointer(root: unknown, pointer: string): unknown {
  if (!pointer.startsWith('/')) return undefined;
  let current = root;
  for (const part of pointer.slice(1).split('/').map(decodePointerPart)) {
    if (!current || typeof current !== 'object' || !(part in current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function resolveRef(schema: JsonSchema, root: JsonSchema): JsonSchema {
  if (!isObjectSchema(schema) || typeof schema.$ref !== 'string') return schema;
  if (!schema.$ref.startsWith('#/')) throw new Error(`Unsupported non-local JSON Schema reference: ${schema.$ref}`);
  let target: unknown = root;
  for (const part of schema.$ref.slice(2).split('/').map(decodePointerPart)) {
    if (!target || typeof target !== 'object' || !(part in target)) {
      throw new Error(`Unresolved JSON Schema reference: ${schema.$ref}`);
    }
    target = (target as Record<string, unknown>)[part];
  }
  return target as JsonSchema;
}

function variants(schema: JsonSchema): JsonSchema[] | undefined {
  if (!isObjectSchema(schema)) return undefined;
  if (Array.isArray(schema.anyOf)) return schema.anyOf;
  if (Array.isArray(schema.oneOf)) return schema.oneOf;
  return undefined;
}

function valueType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function schemaTypes(schema: SchemaObject): Set<string> | undefined {
  if (typeof schema.type === 'string') return new Set([schema.type]);
  if (Array.isArray(schema.type)) return new Set(schema.type);
  if ('const' in schema) return new Set([valueType(schema.const)]);
  if (Array.isArray(schema.enum)) return new Set(schema.enum.map(valueType));
  return undefined;
}

function typeAccepted(baselineType: string, currentTypes: Set<string>): boolean {
  return currentTypes.has(baselineType) || (baselineType === 'integer' && currentTypes.has('number'));
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function valueAllowed(value: unknown, schema: SchemaObject): boolean {
  if ('const' in schema && stable(schema.const) !== stable(value)) return false;
  if (Array.isArray(schema.enum) && !schema.enum.some(candidate => stable(candidate) === stable(value))) return false;
  const types = schemaTypes(schema);
  return !types || typeAccepted(valueType(value), types);
}

function numberKeyword(schema: SchemaObject, key: string): number | undefined {
  const value = schema[key];
  return typeof value === 'number' ? value : undefined;
}

function lowerBound(schema: SchemaObject): { value: number; exclusive: boolean } | undefined {
  const exclusive = numberKeyword(schema, 'exclusiveMinimum');
  if (exclusive !== undefined) return { value: exclusive, exclusive: true };
  const inclusive = numberKeyword(schema, 'minimum');
  return inclusive === undefined ? undefined : { value: inclusive, exclusive: false };
}

function upperBound(schema: SchemaObject): { value: number; exclusive: boolean } | undefined {
  const exclusive = numberKeyword(schema, 'exclusiveMaximum');
  if (exclusive !== undefined) return { value: exclusive, exclusive: true };
  const inclusive = numberKeyword(schema, 'maximum');
  return inclusive === undefined ? undefined : { value: inclusive, exclusive: false };
}

function currentLowerAcceptsBaseline(current: SchemaObject, baseline: SchemaObject): boolean {
  const next = lowerBound(current);
  if (!next) return true;
  const previous = lowerBound(baseline);
  if (!previous) return false;
  if (next.value < previous.value) return true;
  if (next.value > previous.value) return false;
  return !next.exclusive || previous.exclusive;
}

function currentUpperAcceptsBaseline(current: SchemaObject, baseline: SchemaObject): boolean {
  const next = upperBound(current);
  if (!next) return true;
  const previous = upperBound(baseline);
  if (!previous) return false;
  if (next.value > previous.value) return true;
  if (next.value < previous.value) return false;
  return !next.exclusive || previous.exclusive;
}

function incompatibleInput(
  baselineSchema: JsonSchema,
  currentSchema: JsonSchema,
  baselineRoot: JsonSchema,
  currentRoot: JsonSchema,
  path: string,
  seen: Set<string>
): string | undefined {
  const baseline = resolveRef(baselineSchema, baselineRoot);
  const current = resolveRef(currentSchema, currentRoot);
  const pairKey = `${path}:${stable(baseline)}:${stable(current)}`;
  if (seen.has(pairKey)) return undefined;
  seen.add(pairKey);

  if (baseline === false) return undefined;
  if (current === true) return undefined;
  if (baseline === true) return `${path} is newly constrained`;
  if (current === false) return `${path} rejects all baseline values`;

  const baselineVariants = variants(baseline);
  const currentVariants = variants(current);
  if (baselineVariants || currentVariants) {
    const from = baselineVariants ?? [baseline];
    const to = currentVariants ?? [current];
    for (let index = 0; index < from.length; index += 1) {
      const accepted = to.some(candidate => !incompatibleInput(
        from[index]!, candidate, baselineRoot, currentRoot, `${path}.variant[${index}]`, new Set(seen)
      ));
      if (!accepted) return `${path}.variant[${index}] is no longer accepted`;
    }
    return undefined;
  }

  if ('const' in baseline && !valueAllowed(baseline.const, current)) return `${path} no longer accepts the baseline constant`;
  if (Array.isArray(baseline.enum) && !baseline.enum.every(value => valueAllowed(value, current))) {
    return `${path} removes one or more baseline enum values`;
  }

  const baselineTypes = schemaTypes(baseline);
  const currentTypes = schemaTypes(current);
  if (currentTypes && (!baselineTypes || ![...baselineTypes].every(type => typeAccepted(type, currentTypes)))) {
    return `${path}.type is narrower than the baseline`;
  }

  const baselineMinLength = numberKeyword(baseline, 'minLength') ?? 0;
  const currentMinLength = numberKeyword(current, 'minLength') ?? 0;
  if (currentMinLength > baselineMinLength) return `${path}.minLength is stricter than the baseline`;
  const baselineMaxLength = numberKeyword(baseline, 'maxLength') ?? Number.POSITIVE_INFINITY;
  const currentMaxLength = numberKeyword(current, 'maxLength') ?? Number.POSITIVE_INFINITY;
  if (currentMaxLength < baselineMaxLength) return `${path}.maxLength is stricter than the baseline`;

  for (const keyword of ['pattern', 'format'] as const) {
    if (current[keyword] !== undefined && current[keyword] !== baseline[keyword]) {
      return `${path}.${keyword} introduces a changed input restriction`;
    }
  }
  if (current.multipleOf !== undefined && current.multipleOf !== baseline.multipleOf) {
    return `${path}.multipleOf introduces a changed input restriction`;
  }
  if (!currentLowerAcceptsBaseline(current, baseline)) return `${path} has a stricter lower bound`;
  if (!currentUpperAcceptsBaseline(current, baseline)) return `${path} has a stricter upper bound`;

  const baselineMinItems = numberKeyword(baseline, 'minItems') ?? 0;
  const currentMinItems = numberKeyword(current, 'minItems') ?? 0;
  if (currentMinItems > baselineMinItems) return `${path}.minItems is stricter than the baseline`;
  const baselineMaxItems = numberKeyword(baseline, 'maxItems') ?? Number.POSITIVE_INFINITY;
  const currentMaxItems = numberKeyword(current, 'maxItems') ?? Number.POSITIVE_INFINITY;
  if (currentMaxItems < baselineMaxItems) return `${path}.maxItems is stricter than the baseline`;

  if (baseline.items !== undefined && current.items !== undefined) {
    const issue = incompatibleInput(baseline.items, current.items, baselineRoot, currentRoot, `${path}.items`, seen);
    if (issue) return issue;
  } else if (baseline.items === undefined && current.items === false) {
    return `${path}.items newly rejects additional array items`;
  }

  const baselinePrefix = baseline.prefixItems ?? [];
  const currentPrefix = current.prefixItems ?? [];
  for (let index = 0; index < baselinePrefix.length; index += 1) {
    const target = currentPrefix[index] ?? current.items;
    if (target === undefined) continue;
    const issue = incompatibleInput(baselinePrefix[index]!, target, baselineRoot, currentRoot, `${path}.prefixItems[${index}]`, seen);
    if (issue) return issue;
  }

  const baselineRequired = new Set(baseline.required ?? []);
  for (const required of current.required ?? []) {
    if (!baselineRequired.has(required)) return `${path}.required adds ${required}`;
  }

  const baselineProperties = baseline.properties ?? {};
  const currentProperties = current.properties ?? {};
  for (const [name, baselineProperty] of Object.entries(baselineProperties)) {
    let currentProperty = currentProperties[name];
    if (currentProperty === undefined) {
      if (current.additionalProperties === false) return `${path}.properties.${name} is no longer accepted`;
      if (isObjectSchema(current.additionalProperties)) currentProperty = current.additionalProperties;
      else continue;
    }
    const issue = incompatibleInput(
      baselineProperty, currentProperty, baselineRoot, currentRoot, `${path}.properties.${name}`, seen
    );
    if (issue) return issue;
  }

  const baselineAdditional = baseline.additionalProperties;
  const currentAdditional = current.additionalProperties;
  if (baselineAdditional !== false && currentAdditional === false) {
    return `${path}.additionalProperties newly rejects baseline-valid properties`;
  }
  if (isObjectSchema(baselineAdditional) && isObjectSchema(currentAdditional)) {
    const issue = incompatibleInput(
      baselineAdditional, currentAdditional, baselineRoot, currentRoot, `${path}.additionalProperties`, seen
    );
    if (issue) return issue;
  }

  if (current.propertyNames !== undefined) {
    if (baseline.propertyNames === undefined) return `${path}.propertyNames adds an input restriction`;
    const issue = incompatibleInput(
      baseline.propertyNames as JsonSchema,
      current.propertyNames as JsonSchema,
      baselineRoot,
      currentRoot,
      `${path}.propertyNames`,
      seen
    );
    if (issue) return issue;
  }

  return undefined;
}

const NON_SEMANTIC_SCHEMA_KEYS = new Set(['$schema', '$defs', 'description', 'title', 'default', 'examples']);

function canonicalSchema(schema: JsonSchema, root: JsonSchema, refStack = new Set<string>()): unknown {
  if (!isObjectSchema(schema)) return schema;
  if (typeof schema.$ref === 'string') {
    if (refStack.has(schema.$ref)) return { recursiveRef: schema.$ref };
    const nextStack = new Set(refStack).add(schema.$ref);
    return canonicalSchema(resolveRef(schema, root), root, nextStack);
  }

  const entries = Object.entries(schema)
    .filter(([key, value]) => !NON_SEMANTIC_SCHEMA_KEYS.has(key) && value !== undefined)
    .map(([key, value]) => {
      if ((key === 'required' || key === 'enum') && Array.isArray(value)) {
        return [key, [...value].sort((left, right) => stable(left).localeCompare(stable(right)))] as const;
      }
      if ((key === 'anyOf' || key === 'oneOf') && Array.isArray(value)) {
        const normalized = value.map(item => canonicalSchema(item as JsonSchema, root, refStack));
        return [key, normalized.sort((left, right) => stable(left).localeCompare(stable(right)))] as const;
      }
      if (key === 'properties' && value && typeof value === 'object') {
        return [key, Object.fromEntries(Object.entries(value as Record<string, JsonSchema>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, item]) => [name, canonicalSchema(item, root, refStack)]))] as const;
      }
      if ((key === 'items' || key === 'additionalProperties' || key === 'propertyNames') &&
          (typeof value === 'boolean' || (value && typeof value === 'object'))) {
        return [key, canonicalSchema(value as JsonSchema, root, refStack)] as const;
      }
      if (key === 'prefixItems' && Array.isArray(value)) {
        return [key, value.map(item => canonicalSchema(item as JsonSchema, root, refStack))] as const;
      }
      return [key, value] as const;
    })
    .sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(entries);
}

function firstDifference(left: unknown, right: unknown, path: string): string | undefined {
  if (stable(left) === stable(right)) return undefined;
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return `${path} changed array cardinality`;
    for (let index = 0; index < left.length; index += 1) {
      const issue = firstDifference(left[index], right[index], `${path}[${index}]`);
      if (issue) return issue;
    }
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    for (const key of new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])) {
      if (!(key in rightRecord)) return `${path}.${key} was removed`;
      if (!(key in leftRecord)) return `${path}.${key} was added`;
      const issue = firstDifference(leftRecord[key], rightRecord[key], `${path}.${key}`);
      if (issue) return issue;
    }
  }
  return `${path} changed from ${stable(left)} to ${stable(right)}`;
}

export function checkContractCompatibility(
  baseline: ToolContractSnapshot,
  currentTools: readonly ToolContract[],
  options: ContractCompatibilityOptions = {}
): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];
  const baselineNames = baseline.tools.map(tool => tool.name).sort();
  const currentNames = currentTools.map(tool => tool.name).sort();
  if (baseline.toolCount !== baseline.tools.length) {
    issues.push({ area: 'inventory', path: 'baseline.toolCount', message: 'Baseline toolCount does not match its tool array.' });
  }
  if (currentTools.length !== baseline.toolCount || new Set(currentNames).size !== currentNames.length) {
    issues.push({ area: 'inventory', path: 'tools', message: `Expected ${baseline.toolCount} unique tools, received ${currentTools.length}.` });
  }
  if (stable(baselineNames) !== stable(currentNames)) {
    issues.push({ area: 'inventory', path: 'tools.names', message: 'Tool names differ from the frozen baseline.' });
  }

  const currentByName = new Map(currentTools.map(tool => [tool.name, tool] as const));
  const baselineByName = new Map(baseline.tools.map(tool => [tool.name, tool] as const));
  const reviewedLimitsByTool = new Map<string, ReviewedInputLimit[]>();
  const reviewedLimitKeys = new Set<string>();
  for (const limit of options.reviewedInputLimits ?? []) {
    const key = `${limit.tool}:${limit.path}`;
    if (reviewedLimitKeys.has(key)) {
      issues.push({ tool: limit.tool, area: 'input', path: limit.path, message: 'Reviewed input limit is duplicated.' });
      continue;
    }
    reviewedLimitKeys.add(key);
    const previous = baselineByName.get(limit.tool);
    const baselineTarget = previous ? valueAtPointer(previous.inputSchema, limit.path) : undefined;
    if (!previous || !isObjectSchema(baselineTarget) || baselineTarget.type !== 'array' || baselineTarget.maxItems !== undefined) {
      issues.push({
        tool: limit.tool,
        area: 'input',
        path: limit.path,
        message: 'Reviewed input limit must identify an unbounded array in the frozen baseline.'
      });
      continue;
    }
    if (!Number.isSafeInteger(limit.maxItems) || limit.maxItems < 1) {
      issues.push({ tool: limit.tool, area: 'input', path: limit.path, message: 'Reviewed maxItems must be a positive safe integer.' });
      continue;
    }
    const current = currentByName.get(limit.tool);
    const currentTarget = current ? valueAtPointer(current.inputSchema, limit.path) : undefined;
    if (!isObjectSchema(currentTarget) || currentTarget.type !== 'array' || currentTarget.maxItems !== limit.maxItems) {
      issues.push({
        tool: limit.tool,
        area: 'input',
        path: limit.path,
        message: `Final schema must use the reviewed maxItems value ${limit.maxItems}.`
      });
      continue;
    }
    const scoped = reviewedLimitsByTool.get(limit.tool) ?? [];
    scoped.push(limit);
    reviewedLimitsByTool.set(limit.tool, scoped);
  }

  for (const previous of baseline.tools) {
    const current = currentByName.get(previous.name);
    if (!current) continue;
    for (const key of ['title', 'description'] as const) {
      if (current[key] !== previous[key]) {
        issues.push({ tool: previous.name, area: 'metadata', path: key, message: `${key} changed from the frozen baseline.` });
      }
    }
    if (stable(current.annotations ?? {}) !== stable(previous.annotations ?? {})) {
      issues.push({ tool: previous.name, area: 'annotations', path: 'annotations', message: 'Annotations changed from the frozen baseline.' });
    }

    const reviewedBaselineInput = structuredClone(previous.inputSchema);
    for (const limit of reviewedLimitsByTool.get(previous.name) ?? []) {
      const target = valueAtPointer(reviewedBaselineInput, limit.path) as SchemaObject;
      target.maxItems = limit.maxItems;
    }
    const inputIssue = incompatibleInput(
      reviewedBaselineInput,
      current.inputSchema,
      reviewedBaselineInput,
      current.inputSchema,
      'inputSchema',
      new Set()
    );
    if (inputIssue) {
      issues.push({ tool: previous.name, area: 'input', path: inputIssue.split(' ')[0]!, message: inputIssue });
    }

    const outputIssue = firstDifference(
      canonicalSchema(previous.outputSchema, previous.outputSchema),
      canonicalSchema(current.outputSchema, current.outputSchema),
      'outputSchema'
    );
    if (outputIssue) {
      issues.push({ tool: previous.name, area: 'output', path: outputIssue.split(' ')[0]!, message: outputIssue });
    }
  }

  return issues;
}
