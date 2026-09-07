import { describe, expect, it } from 'vitest';
import { mapError, PublicError, toErrorPayload } from '../src/errors.js';
import { createLogger, protectStdout } from '../src/logger.js';
import { redact } from '../src/redaction.js';

describe('redaction and public errors', () => {
  const sentinel = 'SENTINEL-CREDENTIAL-91f4';

  it('redacts exact secrets, URL user-info, bearer tokens, and credential pairs', () => {
    const output = redact(
      `failed ${sentinel} http://admin:pw@actual.local password=hunter2 token=abc Bearer jwt.value.secret ` +
      'sync_id=private-budget data_dir=/private/tmp/private-cache ACTUAL_SERVER_URL=http://internal.example/private ' +
      '/Users/private/person/budget.sqlite C:\\Users\\private\\budget.sqlite',
      [sentinel]
    );
    expect(output).not.toContain(sentinel);
    expect(output).not.toContain('admin:pw');
    expect(output).not.toContain('hunter2');
    expect(output).not.toContain('jwt.value.secret');
    expect(output).not.toContain('private-budget');
    expect(output).not.toContain('private-cache');
    expect(output).not.toContain('internal.example');
    expect(output).not.toContain('/Users/private');
    expect(output).not.toContain('C:\\Users\\private');
  });

  it('maps connection failures to a stable retryable error', () => {
    const mapped = mapError(new Error(`fetch failed password=${sentinel}`), 'actual_sync', [sentinel]);
    expect(toErrorPayload(mapped)).toEqual({ error: {
      code: 'CONNECTION_ERROR', message: 'The Actual Server is unavailable.', operation: 'actual_sync', retryable: true
    } });
  });

  it('preserves stable public codes while removing secrets', () => {
    const privatePath = '/Users/private/person/.actual-cache/budget.sqlite';
    const syncId = 'private-sync-id';
    const mapped = mapError(new PublicError(
      'NOT_FOUND', `Missing ${sentinel} sync_id=${syncId} at ${privatePath}`, 'actual_get_account', false,
      { details: { syncId, privatePath, environmentValue: sentinel } }
    ), 'ignored', [sentinel, syncId, privatePath]);
    expect(mapped.code).toBe('NOT_FOUND');
    expect(mapped.message).not.toContain(sentinel);
    expect(JSON.stringify(toErrorPayload(mapped))).not.toMatch(/private-sync-id|\/Users\/private|SENTINEL-CREDENTIAL/);
  });

  it('converts arbitrary SDK messages and stacks into a stable generic envelope', () => {
    const upstream = new Error(
      `unstable SDK failure ${sentinel} sync_id=private-sync /Users/private/budget.sqlite\n` +
      '    at internalActualFunction (/Users/private/sdk.js:10:2)'
    );
    const payload = toErrorPayload(mapError(upstream, 'actual_sync', [sentinel]));
    expect(payload).toEqual({ error: {
      code: 'INTERNAL_ERROR', message: 'The Actual operation failed unexpectedly.', operation: 'actual_sync', retryable: false
    } });
    expect(JSON.stringify(payload)).not.toMatch(/unstable SDK|private-sync|\/Users\/private|internalActualFunction|SENTINEL-CREDENTIAL/);
  });

  it('writes sanitized structured logs exclusively through the injected stderr writer', () => {
    let captured = '';
    const logger = createLogger([sentinel], text => { captured += text; });
    logger.error(`Failure ${sentinel}`, { url: 'http://user:password@actual.local', password: sentinel });
    expect(captured).not.toContain(sentinel);
    expect(captured).not.toContain('user:password');
    expect(JSON.parse(captured)).toMatchObject({ level: 'error' });
  });

  it('suppresses SDK console payloads instead of moving private data from stdout to stderr', () => {
    const original = { log: console.log, info: console.info, debug: console.debug, warn: console.warn, error: console.error, write: process.stderr.write };
    let captured = '';
    process.stderr.write = ((text: string) => { captured += text; return true; }) as typeof process.stderr.write;
    try {
      protectStdout();
      console.log(`note=private ${sentinel} amount=12345 query=SELECT * FROM transactions`);
      console.error('/Users/private/person/budget.sqlite');
      expect(captured).toBe('SDK console output suppressed to preserve MCP protocol and privacy.\n'.repeat(2));
    } finally {
      console.log = original.log;
      console.info = original.info;
      console.debug = original.debug;
      console.warn = original.warn;
      console.error = original.error;
      process.stderr.write = original.write;
    }
  });
});
