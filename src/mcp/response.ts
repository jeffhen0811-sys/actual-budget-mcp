import type { CallToolResult } from '@modelcontextprotocol/server';
import { mapError, toErrorPayload } from '../errors.js';
import type { Logger } from '../logger.js';

export function successResult<T extends object>(value: T): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value as Record<string, unknown>
  };
}

export function toolError(error: unknown, operation: string, logger: Logger): CallToolResult {
  const mapped = mapError(error, operation);
  const payload = toErrorPayload(mapped);
  logger.error('Tool operation failed.', { operation, code: mapped.code, retryable: mapped.retryable });
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
    isError: true
  };
}
