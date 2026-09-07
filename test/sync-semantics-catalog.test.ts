import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { SYNC_SEMANTICS_REVIEW } from '../src/mcp/sync-semantics.js';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';

describe('reviewed synchronization semantics catalog', () => {
  it('covers exactly every mutation-capable tool and preserves the v1 sync-policy split', () => {
    const mutations = TOOL_DEFINITIONS.filter(tool => tool.capability !== 'read');
    expect(mutations).toHaveLength(35);
    expect(Object.keys(SYNC_SEMANTICS_REVIEW).sort()).toEqual(mutations.map(tool => tool.name).sort());
    expect(mutations.filter(tool => tool.synchronization === 'sync-only').map(tool => tool.name)).toEqual(['actual_sync']);
    expect(mutations.filter(tool => tool.synchronization === 'write-and-sync')).toHaveLength(34);
    expect(mutations.filter(tool => tool.synchronization === 'write-without-sync')).toHaveLength(0);
    for (const tool of mutations) {
      expect(SYNC_SEMANTICS_REVIEW[tool.name as keyof typeof SYNC_SEMANTICS_REVIEW].readBack.trim(), tool.name).not.toBe('');
    }
  });

  it('documents exact read-back and recovery boundaries for every mutation', async () => {
    const document = await readFile('docs/sync-semantics-v1.md', 'utf8');
    expect(document.match(/^\| `actual_/gm)).toHaveLength(35);
    expect(document).toContain('There are no\n`write-without-sync` tools');
    expect(document).toContain('Do not replay');
    for (const tool of TOOL_DEFINITIONS.filter(tool => tool.capability !== 'read')) {
      expect(document, tool.name).toContain(`\`${tool.name}\``);
    }
  });
});
