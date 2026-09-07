import { readFile, writeFile } from 'node:fs/promises';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';

const OUTPUT_PATH = 'docs/tool-inventory-v1.md';
const MANIFEST_PATH = 'test/fixtures/tool-verification-manifest-v1.json';

interface EvidenceReference {
  file: string;
  test: string;
}

interface VerificationEntry {
  name: string;
  evidence: Record<'unit' | 'contract' | 'integration' | 'e2e', EvidenceReference[]>;
}

interface VerificationManifest {
  formatVersion: number;
  tools: VerificationEntry[];
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}

function schemaText(schema: typeof TOOL_DEFINITIONS[number]['inputSchema'], direction: 'input' | 'output'): string {
  const jsonSchema = schema['~standard'].jsonSchema[direction]({ target: 'draft-2020-12' });
  return JSON.stringify(normalize(jsonSchema), null, 2);
}

function evidenceText(references: EvidenceReference[]): string {
  return references.map(reference => `\`${reference.file}\` — ${reference.test}`).join('; ');
}

function guards(capability: typeof TOOL_DEFINITIONS[number]['capability']): string {
  if (capability === 'read') return 'None';
  if (capability === 'write') return '`ACTUAL_MCP_READ_ONLY`';
  return '`ACTUAL_MCP_READ_ONLY`, then `ACTUAL_MCP_ALLOW_DESTRUCTIVE`';
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as VerificationManifest;
const evidenceByName = new Map(manifest.tools.map(entry => [entry.name, entry] as const));
const definitions = [...TOOL_DEFINITIONS].sort((left, right) => left.name.localeCompare(right.name));
if (definitions.length !== 62 || manifest.tools.length !== 62) {
  throw new Error(`Inventory requires 62 definitions and 62 manifest entries; received ${definitions.length}/${manifest.tools.length}.`);
}

const sections = definitions.map(definition => {
  const verification = evidenceByName.get(definition.name);
  if (!verification) throw new Error(`Missing verification manifest entry for ${definition.name}.`);
  return `## \`${definition.name}\`

- Title: ${definition.title}
- Domain: \`${definition.domain}\`
- Description: ${definition.description}
- Capability: \`${definition.capability}\`
- Mutation-capable: ${definition.capability === 'read' ? 'No' : 'Yes'}
- Destructive: ${definition.capability === 'destructive' ? 'Yes' : 'No'}
- Idempotent: ${definition.idempotent ? 'Yes' : 'No'}
- Confirmation: \`${definition.confirmation}\`
- Bounds: ${definition.bounds.length > 0 ? definition.bounds.map(bound => `\`${bound}\``).join(', ') : 'None'}
- Runtime guards: ${guards(definition.capability)}
- Synchronization: \`${definition.synchronization}\`
- Partial failure: \`${definition.partialFailure}\`
- Unit evidence: ${evidenceText(verification.evidence.unit)}
- Contract evidence: ${evidenceText(verification.evidence.contract)}
- Integration evidence: ${evidenceText(verification.evidence.integration)}
- Compiled stdio E2E evidence: ${evidenceText(verification.evidence.e2e)}

<details>
<summary>Input schema</summary>

\`\`\`json
${schemaText(definition.inputSchema, 'input')}
\`\`\`

</details>

<details>
<summary>Output schema</summary>

\`\`\`json
${schemaText(definition.outputSchema, 'output')}
\`\`\`

</details>`;
}).join('\n\n');

const content = `# Actual Budget MCP v1 Tool Inventory

This file is generated from the authoritative runtime definitions in \`src/mcp/tool-definitions.ts\` and the
test-only evidence manifest in \`${MANIFEST_PATH}\`. Do not edit it by hand.

- Tool count: 62
- Compatibility baseline: Actual Budget MCP 0.7.0 at \`c5b752a5f7f3067a40480f72078907c72ad26c66\`
- Capability totals: 27 read, 26 write, 9 destructive (35 mutation-capable)
- Schema dialect: JSON Schema draft 2020-12

${sections}
`;

if (process.argv.includes('--check')) {
  const current = await readFile(OUTPUT_PATH, 'utf8').catch(() => '');
  if (current !== content) {
    throw new Error(`${OUTPUT_PATH} is stale. Run npm run inventory:generate and commit the result.`);
  }
  process.stderr.write(`Verified deterministic 62-tool inventory at ${OUTPUT_PATH}.\n`);
} else {
  await writeFile(OUTPUT_PATH, content, 'utf8');
  process.stderr.write(`Generated deterministic 62-tool inventory at ${OUTPUT_PATH}.\n`);
}
