import { access, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';

interface EvidenceReference {
  file: string;
  test: string;
}

interface VerificationEntry {
  name: string;
  evidence: {
    unit: EvidenceReference[];
    contract: EvidenceReference[];
    integration: EvidenceReference[];
    e2e: EvidenceReference[];
  };
}

interface VerificationManifest {
  formatVersion: number;
  baselineVersion: string;
  sourceCommit: string;
  tools: VerificationEntry[];
}

const manifest = JSON.parse(
  await readFile('test/fixtures/tool-verification-manifest-v1.json', 'utf8')
) as VerificationManifest;

describe('tool verification manifest', () => {
  it('maps every authoritative tool exactly once to every evidence layer', () => {
    const expectedNames = TOOL_DEFINITIONS.map(definition => definition.name).sort();
    const actualNames = manifest.tools.map(entry => entry.name).sort();
    expect(manifest).toMatchObject({
      formatVersion: 1,
      baselineVersion: '0.7.0',
      sourceCommit: 'c5b752a5f7f3067a40480f72078907c72ad26c66'
    });
    expect(actualNames).toEqual(expectedNames);
    expect(new Set(actualNames).size).toBe(62);
    for (const entry of manifest.tools) {
      for (const layer of ['unit', 'contract', 'integration', 'e2e'] as const) {
        expect(entry.evidence[layer].length, `${entry.name}:${layer}`).toBeGreaterThan(0);
      }
    }
  });

  it('references files and named tests that exist', async () => {
    const checked = new Set<string>();
    for (const entry of manifest.tools) {
      for (const references of Object.values(entry.evidence)) {
        for (const reference of references) {
          await access(reference.file);
          const key = `${reference.file}\u0000${reference.test}`;
          if (checked.has(key)) continue;
          const source = await readFile(reference.file, 'utf8');
          expect(source, key).toContain(`it('${reference.test}'`);
          checked.add(key);
        }
      }
    }
  });
});
