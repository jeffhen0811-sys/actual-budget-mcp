import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { TOOL_NAMES } from '../src/mcp/server.js';

describe('canonical tool inventory', () => {
  it('is the single 62-name source reused by documentation and readiness assertions', async () => {
    expect(TOOL_NAMES).toHaveLength(62);
    expect(new Set(TOOL_NAMES).size).toBe(62);
    const readme = await readFile('README.md', 'utf8');
    const acceptance = await readFile('docs/manual-acceptance.md', 'utf8');
    const readiness = await readFile('docs/release-readiness-0.7.0.md', 'utf8');
    for (const name of TOOL_NAMES) expect(readme, name).toContain(name);
    expect(acceptance).toContain('exactly 62 tools');
    expect(readiness).toContain('exactly 62 tools');
  });
});
