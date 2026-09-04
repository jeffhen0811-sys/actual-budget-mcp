import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
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

  it('refuses a dirty checkout before update commands and preserves the local edit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'actual-dirty-update-contract-'));
    const run = promisify(execFile);
    try {
      await run('git', ['init'], { cwd: root });
      await run('git', ['config', 'user.email', 'contract@example.invalid'], { cwd: root });
      await run('git', ['config', 'user.name', 'Contract Test'], { cwd: root });
      await writeFile(join(root, 'update.sh'), await readFile('update.sh', 'utf8'));
      await chmod(join(root, 'update.sh'), 0o755);
      await writeFile(join(root, 'tracked.txt'), 'original\n');
      await run('git', ['add', '.'], { cwd: root });
      await run('git', ['commit', '-m', 'fixture'], { cwd: root });
      await writeFile(join(root, 'tracked.txt'), 'local edit\n');
      await expect(run('bash', ['update.sh'], { cwd: root })).rejects.toThrow();
      expect(await readFile(join(root, 'tracked.txt'), 'utf8')).toBe('local edit\n');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
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

  it('executes a fresh isolated v0.7.0 install and produces an executable without touching runtime files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'actual-install-contract-'));
    const run = promisify(execFile);
    try {
      await writeFile(join(root, 'install.sh'), await readFile('install.sh', 'utf8'));
      await chmod(join(root, 'install.sh'), 0o755);
      await writeFile(join(root, 'package.json'), '{"name":"actual-budget-mcp","version":"0.7.0"}\n');
      await writeFile(join(root, 'package-lock.json'), '{"name":"actual-budget-mcp","version":"0.7.0","lockfileVersion":3,"packages":{"":{"name":"actual-budget-mcp","version":"0.7.0"}}}\n');
      for (const [path, value] of [['.env', 'sentinel-env\n'], ['hermes.yaml', 'sentinel-hermes\n']] as const) await writeFile(join(root, path), value);
      for (const directory of ['cache', '.actual-test-data', '.actual-e2e-data']) {
        await mkdir(join(root, directory));
        await writeFile(join(root, directory, 'sentinel'), `${directory}\n`);
      }
      const bin = join(root, 'bin');
      const npmLog = join(root, 'npm.log');
      const dataDir = join(root, 'configured-data');
      await mkdir(bin);
      await writeFile(join(bin, 'npm'), '#!/usr/bin/env bash\necho "$*" >> "$NPM_LOG"\nif [[ "$*" == "run build" ]]; then mkdir -p dist; touch dist/index.js; chmod 755 dist/index.js; fi\n');
      await chmod(join(bin, 'npm'), 0o755);
      await run('bash', ['install.sh'], { cwd: root, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, NPM_LOG: npmLog, ACTUAL_DATA_DIR: dataDir } });
      expect((await readFile(npmLog, 'utf8')).trim().split('\n')).toEqual(['ci', 'run build']);
      expect((await stat(join(root, 'dist/index.js'))).mode & 0o111).toBeGreaterThan(0);
      expect(await readFile(join(root, '.env'), 'utf8')).toBe('sentinel-env\n');
      expect(await readFile(join(root, 'hermes.yaml'), 'utf8')).toBe('sentinel-hermes\n');
      for (const directory of ['cache', '.actual-test-data', '.actual-e2e-data']) {
        expect(await readFile(join(root, directory, 'sentinel'), 'utf8')).toBe(`${directory}\n`);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fast-forwards an isolated v0.6.0 checkout to v0.7.0 while preserving ignored runtime sentinels', async () => {
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
      await writeFile(join(seed, '.gitignore'), '.env\ncache/\n.actual-test-data/\n.actual-e2e-data/\nhermes.yaml\ndist/\n');
      await writeFile(join(seed, 'package.json'), '{"name":"fixture","version":"0.6.0"}\n');
      await writeFile(join(seed, 'package-lock.json'), '{"name":"fixture","version":"0.6.0","lockfileVersion":3,"packages":{"":{"name":"fixture","version":"0.6.0"}}}\n');
      await writeFile(join(seed, 'update.sh'), await readFile('update.sh', 'utf8'));
      await chmod(join(seed, 'update.sh'), 0o755);
      await git(seed, 'add', '.');
      await git(seed, 'commit', '-m', 'v0.6.0');
      await git(seed, 'branch', '-M', 'main');
      await git(seed, 'remote', 'add', 'origin', origin);
      await git(seed, 'push', '-u', 'origin', 'main');
      await git(origin, 'symbolic-ref', 'HEAD', 'refs/heads/main');
      await git(root, 'clone', origin, client);
      await writeFile(join(client, '.env'), 'sentinel-env\n');
      await mkdir(join(client, 'cache'));
      await writeFile(join(client, 'cache', 'sentinel'), 'sentinel-cache\n');
      await mkdir(join(client, '.actual-test-data'));
      await writeFile(join(client, '.actual-test-data', 'sentinel'), 'sentinel-integration\n');
      await mkdir(join(client, '.actual-e2e-data'));
      await writeFile(join(client, '.actual-e2e-data', 'sentinel'), 'sentinel-e2e\n');
      await writeFile(join(client, 'hermes.yaml'), 'sentinel-hermes\n');

      await writeFile(join(seed, 'package.json'), '{"name":"fixture","version":"0.7.0"}\n');
      await writeFile(join(seed, 'package-lock.json'), '{"name":"fixture","version":"0.7.0","lockfileVersion":3,"packages":{"":{"name":"fixture","version":"0.7.0"}}}\n');
      await git(seed, 'add', 'package.json', 'package-lock.json');
      await git(seed, 'commit', '-m', 'v0.7.0');
      await git(seed, 'push');

      const bin = join(root, 'bin');
      const npmLog = join(root, 'npm.log');
      await mkdir(bin);
      await writeFile(join(bin, 'npm'), '#!/usr/bin/env bash\necho "$*" >> "$NPM_LOG"\nif [[ "$*" == "run build" ]]; then mkdir -p dist; touch dist/index.js; fi\n');
      await chmod(join(bin, 'npm'), 0o755);
      await run('bash', ['update.sh'], { cwd: client, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, NPM_LOG: npmLog } });

      expect(await readFile(join(client, 'package.json'), 'utf8')).toContain('"version":"0.7.0"');
      expect(await readFile(join(client, '.env'), 'utf8')).toBe('sentinel-env\n');
      expect(await readFile(join(client, 'cache', 'sentinel'), 'utf8')).toBe('sentinel-cache\n');
      expect(await readFile(join(client, '.actual-test-data', 'sentinel'), 'utf8')).toBe('sentinel-integration\n');
      expect(await readFile(join(client, '.actual-e2e-data', 'sentinel'), 'utf8')).toBe('sentinel-e2e\n');
      expect(await readFile(join(client, 'hermes.yaml'), 'utf8')).toBe('sentinel-hermes\n');
      expect((await readFile(npmLog, 'utf8')).trim().split('\n')).toEqual(['ci', 'run typecheck', 'test', 'run build']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 20_000);
});
