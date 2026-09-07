import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const forbiddenPath = /(^|\/)(?:\.env(?:\..*)?|actual-data|\.actual-(?:test|e2e)-data|coverage|dist|node_modules)(?:\/|$)/;
const allowedEnvironmentExample = /(^|\/)\.env(?:\.integration\.local)?\.example$/;
const privatePath = /\/(?:Users|home)\/[^\s'"`]+/;
const credentialUrl = /https?:\/\/[^\s/@]+:[^\s@]+@/;

const violations: string[] = [];
for (const path of tracked) {
  if (forbiddenPath.test(path) && !allowedEnvironmentExample.test(path)) violations.push(`forbidden tracked runtime path: ${path}`);
  // Tests intentionally exercise redaction with clearly fake secrets and local paths.
  // They are not deployment configuration and are audited by the redaction suite.
  if (path.startsWith('test/')) continue;
  if (!/\.(?:[cm]?[jt]s|json|md|ya?ml|sh|txt)$/i.test(path)) continue;
  const content = readFileSync(path, 'utf8');
  if (privatePath.test(content)) violations.push(`private local path in ${path}`);
  if (credentialUrl.test(content)) violations.push(`credential-bearing URL in ${path}`);
}

if (violations.length > 0) {
  process.stderr.write(`${violations.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Repository hygiene passed for ${tracked.length} tracked files. Synthetic test values are permitted only inside test fixtures.\n`);
}
