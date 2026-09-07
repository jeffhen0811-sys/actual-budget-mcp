import { readFile, writeFile } from 'node:fs/promises';
import { IDEMPOTENCY_REVIEW, type ReviewedMutationToolName } from '../src/mcp/idempotency.js';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';

const OUTPUT_PATH = 'docs/idempotency-v1.md';
const MANIFEST_PATH = 'test/fixtures/tool-verification-manifest-v1.json';

interface EvidenceEntry { file: string; test: string }
interface ManifestTool { name: string; evidence: Record<string, EvidenceEntry[]> }
interface VerificationManifest { tools: ManifestTool[] }

const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as VerificationManifest;
const evidenceByName = new Map(manifest.tools.map(tool => [tool.name, tool.evidence]));

function evidence(name: string): string {
  const layers = evidenceByName.get(name);
  if (!layers) throw new Error(`Missing verification manifest evidence for ${name}.`);
  return ['unit', 'integration', 'e2e'].flatMap(layer => (layers[layer] ?? []).slice(0, 1).map(item =>
    `\`${item.file}\` — ${item.test}`)).join('<br>');
}

const mutations = TOOL_DEFINITIONS.filter(tool => tool.capability !== 'read');
const mutationNames = mutations.map(tool => tool.name).sort();
const reviewNames = Object.keys(IDEMPOTENCY_REVIEW).sort();
if (JSON.stringify(mutationNames) !== JSON.stringify(reviewNames)) {
  throw new Error('IDEMPOTENCY_REVIEW must cover exactly every mutation-capable tool.');
}

const rows = mutations
  .sort((left, right) => left.domain.localeCompare(right.domain) || left.name.localeCompare(right.name))
  .map(tool => {
    const review = IDEMPOTENCY_REVIEW[tool.name as ReviewedMutationToolName];
    const expected = tool.idempotent ? 'idempotent' : 'non-idempotent';
    if (review.classification !== expected) throw new Error(`Idempotency metadata mismatch for ${tool.name}.`);
    const failureRecovery = tool.partialFailure === 'multi-step'
      ? 'Inspect affected/pending IDs, synchronize, and read back before any retry.'
      : tool.partialFailure === 'sync-after-write'
        ? 'Read back the exact entity after an ambiguous write/sync failure before retrying.'
        : tool.partialFailure === 'sync-failure'
          ? 'Retry synchronization only after reviewing the sanitized sync error.'
          : 'No mutation partial state.';
    const preview = ['actual_bulk_update_transactions', 'actual_copy_budget_month', 'actual_create_transfer'].includes(tool.name)
      ? '`dryRun` defaults to `true`'
      : 'None';
    return `| \`${tool.name}\` | \`${review.classification}\` | ${review.repeatBehavior} | \`${tool.confirmation}\` | ${preview} | ${failureRecovery} | ${evidence(tool.name)} |`;
  })
  .join('\n');

const previewEvidence = evidence('actual_preview_import');
const content = `# Actual Budget MCP v1 idempotency

This file is generated from the reviewed operation metadata in \`src/mcp/idempotency.ts\`, the authoritative
definitions in \`src/mcp/tool-definitions.ts\`, and the verification manifest. Do not edit it by hand.

\`idempotent\` describes the observable result of repeating the same request after a confirmed success. It does
not authorize blind replay after a timeout, local write failure, synchronization failure, or verification
failure. In those cases, follow the recovery column and inspect state first. \`non-idempotent\` means an identical
successful call may create another entity, apply another increment, or address identifiers removed by the first
call.

Import preview is intrinsically read-only and has no caller \`dryRun\` switch: \`actual_preview_import\` invokes the
official reconciliation pipeline with SDK \`dryRun: true\`, emits a request fingerprint, performs no sync, and is
covered by ${previewEvidence}.

| Tool | Classification | Successful repeat behavior | Confirmation | Pure preview | Failure recovery | Test evidence |
| --- | --- | --- | --- | --- | --- | --- |
${rows}
`;

if (process.argv.includes('--check')) {
  const current = await readFile(OUTPUT_PATH, 'utf8').catch(() => '');
  if (current !== content) throw new Error(`${OUTPUT_PATH} is stale. Run npm run idempotency:generate and commit the result.`);
  process.stderr.write(`Verified deterministic idempotency catalog at ${OUTPUT_PATH}.\n`);
} else {
  await writeFile(OUTPUT_PATH, content, 'utf8');
  process.stderr.write(`Generated deterministic idempotency catalog at ${OUTPUT_PATH}.\n`);
}
