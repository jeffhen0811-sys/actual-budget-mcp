import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('sanitized bounded performance observations', () => {
  it('documents every required bounded workload without an arbitrary latency SLA', async () => {
    const document = await readFile('docs/performance-observations-v1.md', 'utf8');
    for (const workload of [
      'Transaction search page and totals', 'Import preview', 'Bulk update dry-run',
      'Transfer and duplicate diagnostics', 'Reconciliation', 'Month and annual summaries',
      'Schedule list', 'Runtime status'
    ]) expect(document).toContain(workload);
    expect(document).toContain('not service-level objectives');
    expect(document).not.toMatch(/(?:p95|p99|under \d+ ?ms)/i);
  });

  it('keeps real-suite observation output free of financial values and raw query text', async () => {
    const [readSuite, writeSuite] = await Promise.all([
      readFile('test/integration/read.integration.test.ts', 'utf8'),
      readFile('test/integration/write.integration.test.ts', 'utf8')
    ]);
    expect(readSuite).toContain('performance-observation');
    expect(writeSuite).toContain('performance-observation');
  });
});
