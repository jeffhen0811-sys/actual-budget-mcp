import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const requiredReadmeSections = ['Quick Start', 'Requirements', 'Installation and configuration', 'Hermes', 'Security modes', 'Domain navigation', 'Testing and release checks', 'Updating and troubleshooting', 'Versioning and limitations'];
const requiredDocs = ['docs/public-contract-v1.md', 'docs/import-workflow-v1.md', 'docs/acceptance-matrix-v1.md', 'docs/support-matrix-v1.md', 'docs/hermes-upgrade-v1.md', 'docs/hermes-smoke-test-v1.md'];

describe('v1 documentation', () => {
  it('documents the supported v1 operational surface without private values', async () => {
    const readme = await readFile('README.md', 'utf8');
    for (const heading of requiredReadmeSections) expect(readme).toContain(`## ${heading}`);
    expect(readme).toContain('1.0.0');
    expect(readme).toContain('@actual-app/api` `26.8.1');
    expect(readme).toContain('Read-only mode');
    expect(readme).toContain('Destructive-disabled mode');
    expect(readme).toContain('intentionally unsupported');
    expect(readme).not.toMatch(/ACTUAL_PASSWORD=\S+/);
    expect(readme).not.toMatch(/https?:\/\/[^\s/@]+:[^\s@]+@/);
  });

  it('ships the required public guides and a status-only acceptance matrix', async () => {
    for (const path of requiredDocs) expect(await readFile(path, 'utf8')).not.toHaveLength(0);
    const matrix = await readFile('docs/acceptance-matrix-v1.md', 'utf8');
    for (const row of matrix.split('\n').filter(line => line.startsWith('|') && !line.includes('---') && !line.includes('| Domain |'))) {
      for (const cell of row.split('|').slice(1, -1).slice(1).filter((_, index) => index !== 3)) expect(['PASS', 'FAIL', 'N/A', 'UNSUPPORTED']).toContain(cell.trim());
    }
  });
});
