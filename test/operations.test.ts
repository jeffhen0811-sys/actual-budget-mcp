import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
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

  it('keeps the Docker runtime reproducible, non-root, stdio-based, and cache scoped', async () => {
    const dockerfile = await readFile('Dockerfile', 'utf8');
    expect(dockerfile).toContain('FROM node:22-bookworm-slim AS build');
    expect(dockerfile).toContain('RUN npm ci');
    expect(dockerfile).toContain('RUN npm run build && npm prune --omit=dev');
    expect(dockerfile).toContain('ACTUAL_DATA_DIR=/var/lib/actual-budget-mcp');
    expect(dockerfile).toContain('USER node');
    expect(dockerfile).toContain('VOLUME ["/var/lib/actual-budget-mcp"]');
    expect(dockerfile).toContain('ENTRYPOINT ["node", "dist/index.js"]');
    expect(dockerfile).not.toMatch(/ACTUAL_PASSWORD|ACTUAL_SYNC_ID|EXPOSE/);
  });

  it('fast-forwards an isolated v0.5.0 checkout to v0.6.0 while preserving ignored runtime sentinels', async () => {
    const root = await mkdtemp(join(tmpdir(), 'actual-update-contract-'));
    const run = promisify(execFile);
    const git = async (cwd: string, ...args: string[]) => run('git', args, { cwd });
    try {
      const origin = join(root, 'origin.git');
      const seed = join(root, 'seed');
      const client = join(root, 'client');
      await git(root, 'init', '--bare', origin);
      await mkdir(seed);
      await git(seed, 'init');
      await git(seed, 'config', 'user.email', 'contract@example.invalid');
      await git(seed, 'config', 'user.name', 'Contract Test');
      await writeFile(join(seed, '.gitignore'), '.env\ncache/\nhermes.yaml\ndist/\n');
      await writeFile(join(seed, 'package.json'), '{"name":"fixture","version":"0.5.0"}\n');
      await writeFile(join(seed, 'package-lock.json'), '{"name":"fixture","version":"0.5.0","lockfileVersion":3,"packages":{"":{"name":"fixture","version":"0.5.0"}}}\n');
      await writeFile(join(seed, 'update.sh'), await readFile('update.sh', 'utf8'));
      await chmod(join(seed, 'update.sh'), 0o755);
      await git(seed, 'add', '.');
      await git(seed, 'commit', '-m', 'v0.5.0');
      await git(seed, 'branch', '-M', 'main');
      await git(seed, 'remote', 'add', 'origin', origin);
      await git(seed, 'push', '-u', 'origin', 'main');
      await git(origin, 'symbolic-ref', 'HEAD', 'refs/heads/main');
      await git(root, 'clone', origin, client);
      await writeFile(join(client, '.env'), 'sentinel-env\n');
      await mkdir(join(client, 'cache'));
      await writeFile(join(client, 'cache', 'sentinel'), 'sentinel-cache\n');
      await writeFile(join(client, 'hermes.yaml'), 'sentinel-hermes\n');

      await writeFile(join(seed, 'package.json'), '{"name":"fixture","version":"0.6.0"}\n');
      await writeFile(join(seed, 'package-lock.json'), '{"name":"fixture","version":"0.6.0","lockfileVersion":3,"packages":{"":{"name":"fixture","version":"0.6.0"}}}\n');
      await git(seed, 'add', 'package.json', 'package-lock.json');
      await git(seed, 'commit', '-m', 'v0.6.0');
      await git(seed, 'push');

      const bin = join(root, 'bin');
      const npmLog = join(root, 'npm.log');
      await mkdir(bin);
      await writeFile(join(bin, 'npm'), '#!/usr/bin/env bash\necho "$*" >> "$NPM_LOG"\nif [[ "$*" == "run build" ]]; then mkdir -p dist; touch dist/index.js; fi\n');
      await chmod(join(bin, 'npm'), 0o755);
      await run('bash', ['update.sh'], { cwd: client, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, NPM_LOG: npmLog } });

      expect(await readFile(join(client, 'package.json'), 'utf8')).toContain('"version":"0.6.0"');
      expect(await readFile(join(client, '.env'), 'utf8')).toBe('sentinel-env\n');
      expect(await readFile(join(client, 'cache', 'sentinel'), 'utf8')).toBe('sentinel-cache\n');
      expect(await readFile(join(client, 'hermes.yaml'), 'utf8')).toBe('sentinel-hermes\n');
      expect((await readFile(npmLog, 'utf8')).trim().split('\n')).toEqual(['ci', 'run typecheck', 'test', 'run build']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 20_000);
});
