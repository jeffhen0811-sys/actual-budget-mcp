import { readFile, writeFile } from 'node:fs/promises';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';
import { PUBLIC_LIMIT_CATALOG } from '../src/schemas.js';

const OUTPUT_PATH = 'docs/limits-v1.md';

const rows = Object.entries(PUBLIC_LIMIT_CATALOG)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([name, definition]) => {
    const tools = TOOL_DEFINITIONS.filter(tool => tool.bounds.includes(name as never)).map(tool => `\`${tool.name}\``);
    return `| \`${name}\` | ${definition.value} | \`${definition.kind}\` | ${tools.join(', ') || 'Shared schema/runtime'} | ${definition.description} |`;
  })
  .join('\n');

const content = `# Actual Budget MCP v1 limits

This file is generated from \`PUBLIC_LIMIT_CATALOG\` in \`src/schemas.ts\`. Do not edit it by hand.

Public limits reject oversized requests or results before unbounded work or mutation. Defaults are applied by
the input schema. Sentinel limits are internal, fixed query sizes: they request exactly one extra row (or one
linked counterpart) only to prove that a complete operation fits within its public maximum. They never expand
the number of records returned to a caller.

| Name | Value | Kind | Tool consumers | Meaning |
| --- | ---: | --- | --- | --- |
${rows}
`;

if (process.argv.includes('--check')) {
  const current = await readFile(OUTPUT_PATH, 'utf8').catch(() => '');
  if (current !== content) throw new Error(`${OUTPUT_PATH} is stale. Run npm run limits:generate and commit the result.`);
  process.stderr.write(`Verified deterministic public limits catalog at ${OUTPUT_PATH}.\n`);
} else {
  await writeFile(OUTPUT_PATH, content, 'utf8');
  process.stderr.write(`Generated deterministic public limits catalog at ${OUTPUT_PATH}.\n`);
}
