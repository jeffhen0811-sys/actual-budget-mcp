import { describe, expect, it } from 'vitest';
import { mapError, PublicError, toErrorPayload } from '../src/errors.js';
import { createLogger } from '../src/logger.js';
import { redact } from '../src/redaction.js';

describe('redaction and public errors', () => {
  const sentinel = 'SENTINEL-CREDENTIAL-91f4';

  it('redacts exact secrets, URL user-info, bearer tokens, and credential pairs', () => {
    const output = redact(
      `failed ${sentinel} http://admin:pw@actual.local password=hunter2 token=abc Bearer jwt.value.secret`,
      [sentinel]
    );
    expect(output).not.toContain(sentinel);
    expect(output).not.toContain('admin:pw');
    expect(output).not.toContain('hunter2');
    expect(output).not.toContain('jwt.value.secret');
  });

  it('maps connection failures to a stable retryable error', () => {
    const mapped = mapError(new Error(`fetch failed password=${sentinel}`), 'actual_sync', [sentinel]);
    expect(toErrorPayload(mapped)).toEqual({ error: {
      code: 'CONNECTION_ERROR', message: 'The Actual Server is unavailable.', operation: 'actual_sync', retryable: true
    } });
  });

  it('preserves stable public codes while removing secrets', () => {
    const mapped = mapError(new PublicError('NOT_FOUND', `Missing ${sentinel}`, 'actual_get_account', false), 'ignored', [sentinel]);
    expect(mapped.code).toBe('NOT_FOUND');
    expect(mapped.message).not.toContain(sentinel);
  });

  it('writes sanitized structured logs exclusively through the injected stderr writer', () => {
    let captured = '';
    const logger = createLogger([sentinel], text => { captured += text; });
    logger.error(`Failure ${sentinel}`, { url: 'http://user:password@actual.local', password: sentinel });
    expect(captured).not.toContain(sentinel);
    expect(captured).not.toContain('user:password');
    expect(JSON.parse(captured)).toMatchObject({ level: 'error' });
  });
});
