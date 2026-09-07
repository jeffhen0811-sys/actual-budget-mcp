import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { TOOL_NAMES } from '../../src/mcp/tool-registry.js';

interface Baseline {
  toolCount: number;
  tools: Array<{ name: string }>;
}

const baseline = JSON.parse(
  await readFile('test/fixtures/contracts/v0.7.0-tool-discovery.json', 'utf8')
) as Baseline;
const baselineNames = baseline.tools.map(tool => tool.name).sort();
const legacyExceptions = ['actual_health', 'actual_sync'];
const actionResourceName = /^actual_[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)+$/;

describe('frozen tool naming convention', () => {
  it('keeps exactly the 62 baseline names with no alias or rename', () => {
    expect(baseline.toolCount).toBe(62);
    expect(new Set(baselineNames).size).toBe(62);
    expect([...TOOL_NAMES].sort()).toEqual(baselineNames);
  });

  it('has exactly two documented stable legacy exceptions', async () => {
    const exceptions = baselineNames.filter(name => !actionResourceName.test(name));
    expect(exceptions).toEqual(legacyExceptions);

    const audit = await readFile('docs/tool-naming-v1.md', 'utf8');
    for (const name of baselineNames) expect(audit, name).toContain(name);
    expect(audit).toContain('no alias');
    expect(audit).toContain('rename');
  });
});
