import { readFile, writeFile } from 'node:fs/promises';
import { SYNC_SEMANTICS_REVIEW, type ReviewedSyncToolName } from '../src/mcp/sync-semantics.js';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';

const OUTPUT_PATH = 'docs/sync-semantics-v1.md';
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

function recovery(partialFailure: string): string {
  if (partialFailure === 'multi-step') return 'Do not replay. Inspect reported affected, completed, failed, or pending IDs; synchronize, then read back.';
  if (partialFailure === 'sync-after-write') return 'The local write may have succeeded. Do not replay until explicit sync and exact read-back establish state.';
  if (partialFailure === 'sync-failure') return 'No domain write is claimed. Review the sanitized sync error, then retry synchronization when appropriate.';
  return 'No partial mutation state is reported.';
}

const mutations = TOOL_DEFINITIONS.filter(tool => tool.capability !== 'read');
const mutationNames = mutations.map(tool => tool.name).sort();
const reviewNames = Object.keys(SYNC_SEMANTICS_REVIEW).sort();
if (JSON.stringify(mutationNames) !== JSON.stringify(reviewNames)) {
  throw new Error('SYNC_SEMANTICS_REVIEW must cover exactly every mutation-capable tool.');
}

const rows = mutations
  .sort((left, right) => left.domain.localeCompare(right.domain) || left.name.localeCompare(right.name))
  .map(tool => {
    const review = SYNC_SEMANTICS_REVIEW[tool.name as ReviewedSyncToolName];
    return `| \`${tool.name}\` | \`${tool.synchronization}\` | ${review.readBack} | ${recovery(tool.partialFailure)} | ${evidence(tool.name)} |`;
  })
  .join('\n');

const content = `# Actual Budget MCP v1 synchronization semantics

This file is generated from the reviewed read-back metadata in \`src/mcp/sync-semantics.ts\`, authoritative
tool definitions, and the verification manifest. Do not edit it by hand.

Every v1 mutation-capable tool is either \`sync-only\` or \`write-and-sync\`. There are no
\`write-without-sync\` tools in the frozen 62-tool registry. A successful synchronization observation is not a
claim of rollback or atomicity: if a multi-step operation or a post-write sync fails, callers must use the exact
IDs and recovery guidance returned by the error before attempting another mutation.

| Tool | Sync policy | Read-back expectation | Ambiguous-result recovery | Test evidence |
| --- | --- | --- | --- | --- |
${rows}
`;

if (process.argv.includes('--check')) {
  const current = await readFile(OUTPUT_PATH, 'utf8').catch(() => '');
  if (current !== content) throw new Error(`${OUTPUT_PATH} is stale. Run npm run sync:generate and commit the result.`);
  process.stderr.write(`Verified deterministic synchronization semantics catalog at ${OUTPUT_PATH}.\n`);
} else {
  await writeFile(OUTPUT_PATH, content, 'utf8');
  process.stderr.write(`Generated deterministic synchronization semantics catalog at ${OUTPUT_PATH}.\n`);
}
