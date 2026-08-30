import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('installation, update, and public CI operations', () => {
  it('keeps installation locked, credential-free, and cache-directory scoped', async () => {
    const script = await readFile('install.sh', 'utf8');
    expect(script).toContain('npm ci');
    expect(script).toContain('npm run build');
    expect(script).toContain('ACTUAL_DATA_DIR');
    expect(script).not.toMatch(/\$\{?ACTUAL_PASSWORD|read\s+.*password/i);
  });

  it('keeps updates fast-forward-only and never resets or removes local runtime data', async () => {
    const script = await readFile('update.sh', 'utf8');
    expect(script).toContain('git pull --ff-only');
    expect(script).toContain('git status --porcelain');
    expect(script).not.toMatch(/git\s+(reset|clean|checkout)|rm\s+-|\.env|\.actual-test-data|\.actual-e2e-data|hermes/i);
  });

  it('keeps public CI locked and independent of private Actual credentials', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8');
    for (const command of ['npm ci', 'npm run typecheck', 'npm test', 'npm run test:contract', 'npm run build']) {
      expect(workflow).toContain(command);
    }
    expect(workflow).not.toMatch(/test:integration|test:e2e|ACTUAL_PASSWORD|ACTUAL_SYNC_ID/);
  });
});
