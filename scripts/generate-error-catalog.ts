import { readFile, writeFile } from 'node:fs/promises';
import { PUBLIC_ERROR_CATALOG } from '../src/errors.js';

const OUTPUT_PATH = 'docs/error-codes-v1.md';

const rows = Object.entries(PUBLIC_ERROR_CATALOG)
  .sort(([leftCode, left], [rightCode, right]) =>
    left.domain.localeCompare(right.domain) || leftCode.localeCompare(rightCode))
  .map(([code, definition]) => {
    const recovery = definition.recoveryFields.length === 0
      ? 'None'
      : definition.recoveryFields.map(field => `\`${field}\``).join(', ');
    return `| \`${code}\` | \`${definition.domain}\` | \`${definition.retryability}\` | ${definition.description} | ${recovery} |`;
  })
  .join('\n');

const content = `# Actual Budget MCP v1 error codes

This file is generated from the exhaustive typed catalog in \`src/errors.ts\`. Do not edit it by hand.

Every error response contains \`code\`, a sanitized English \`message\`, \`operation\`, and the instance-level
boolean \`retryable\`. The catalog's retryability class explains operator behavior: \`never\` is an intentional
boundary, \`after-correction\` requires changed input or policy, \`transient\` may succeed later, and
\`inspect-state-first\` forbids blind replay because a write or synchronization may have progressed.

Safe \`details\` vary by code and are not a globally stable arbitrary object. Codes listing recovery fields may
also return \`state\`, \`partialState\`, bounded identifiers/counts in \`details\`, and a \`recoveryAction\`.

| Code | Domain | Retryability | Meaning | Recovery fields |
| --- | --- | --- | --- | --- |
${rows}
`;

if (process.argv.includes('--check')) {
  const current = await readFile(OUTPUT_PATH, 'utf8').catch(() => '');
  if (current !== content) throw new Error(`${OUTPUT_PATH} is stale. Run npm run errors:generate and commit the result.`);
  process.stderr.write(`Verified deterministic public error catalog at ${OUTPUT_PATH}.\n`);
} else {
  await writeFile(OUTPUT_PATH, content, 'utf8');
  process.stderr.write(`Generated deterministic public error catalog at ${OUTPUT_PATH}.\n`);
}
