import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { PUBLIC_ERROR_CATALOG, PublicError, toErrorPayload } from '../src/errors.js';

describe('public error catalog', () => {
  it('defines complete operator semantics for every typed public code', () => {
    expect(Object.keys(PUBLIC_ERROR_CATALOG)).toHaveLength(53);
    for (const [code, definition] of Object.entries(PUBLIC_ERROR_CATALOG)) {
      expect(definition.domain, code).toMatch(/^[a-z]+$/);
      expect(definition.description.trim(), code).not.toBe('');
      expect(['never', 'after-correction', 'transient', 'inspect-state-first'], code).toContain(definition.retryability);
      expect(new Set(definition.recoveryFields).size, code).toBe(definition.recoveryFields.length);
      if (definition.retryability === 'inspect-state-first' && code !== 'INTERNAL_ERROR') {
        expect(definition.recoveryFields.length, code).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the stable envelope separate from code-specific safe recovery metadata', () => {
    const payload = toErrorPayload(new PublicError(
      'BULK_PARTIAL_STATE', 'Execution stopped.', 'actual_bulk_update_transactions', false,
      {
        state: 'local_change_may_have_succeeded', partialState: true,
        details: { affectedIds: ['transaction-id'] }, recoveryAction: 'Inspect the listed transaction.'
      }
    ));
    expect(payload).toEqual({ error: {
      code: 'BULK_PARTIAL_STATE', message: 'Execution stopped.', operation: 'actual_bulk_update_transactions',
      retryable: false, state: 'local_change_may_have_succeeded', partialState: true,
      details: { affectedIds: ['transaction-id'] }, recoveryAction: 'Inspect the listed transaction.'
    } });
  });

  it('keeps generated documentation exhaustive', async () => {
    const documentation = await readFile('docs/error-codes-v1.md', 'utf8');
    for (const code of Object.keys(PUBLIC_ERROR_CATALOG)) {
      expect(documentation.match(new RegExp('\\| `' + code + '` \\|', 'g')), code).toHaveLength(1);
    }
  });
});
