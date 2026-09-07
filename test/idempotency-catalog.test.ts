import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { IDEMPOTENCY_REVIEW } from '../src/mcp/idempotency.js';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';

describe('reviewed idempotency catalog', () => {
  it('covers exactly all 35 mutation-capable tools and agrees with MCP annotations', () => {
    const mutations = TOOL_DEFINITIONS.filter(tool => tool.capability !== 'read');
    expect(mutations).toHaveLength(35);
    expect(Object.keys(IDEMPOTENCY_REVIEW).sort()).toEqual(mutations.map(tool => tool.name).sort());
    for (const tool of mutations) {
      const review = IDEMPOTENCY_REVIEW[tool.name as keyof typeof IDEMPOTENCY_REVIEW];
      expect(review.classification, tool.name).toBe(tool.idempotent ? 'idempotent' : 'non-idempotent');
      expect(review.repeatBehavior.trim(), tool.name).not.toBe('');
    }
  });

  it('documents the reviewed split and test evidence without claiming blind retry safety', async () => {
    const document = await readFile('docs/idempotency-v1.md', 'utf8');
    expect(document.match(/^\| `actual_/gm)).toHaveLength(35);
    expect(document).toContain('actual_preview_import');
    expect(document).toMatch(/does\s+not authorize blind replay/);
    for (const tool of TOOL_DEFINITIONS.filter(tool => tool.capability !== 'read')) {
      expect(document, tool.name).toContain(`\`${tool.name}\``);
    }
  });
});
