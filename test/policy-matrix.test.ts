import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { describe, expect, it } from 'vitest';
import type { OperationalConfig } from '../src/config.js';
import { createLogger } from '../src/logger.js';
import { createMcpServer, type ToolRuntime } from '../src/mcp/server.js';
import { TOOL_DEFINITIONS } from '../src/mcp/tool-definitions.js';
import { SAFE_MUTATION_ARGUMENTS } from './fixtures/safe-tool-arguments-v1.js';

async function withPolicy(
  policy: OperationalConfig,
  run: (client: Client, invokedHandlers: string[]) => Promise<void>
): Promise<void> {
  const invokedHandlers: string[] = [];
  const blockedHandler = async (..._arguments: unknown[]) => {
    invokedHandlers.push('runtime-handler');
    throw new Error('A policy-blocked runtime handler executed.');
  };
  const runtime = new Proxy({}, { get: () => blockedHandler }) as ToolRuntime;
  const server = createMcpServer(runtime, createLogger([], () => undefined), policy);
  const client = new Client({ name: 'policy-matrix-test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    await run(client, invokedHandlers);
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}

describe('generated MCP policy matrix', () => {
  it('rejects all 35 mutation-capable tools in read-only mode before runtime', async () => {
    await withPolicy({ readOnly: true, allowDestructive: true }, async (client, invokedHandlers) => {
      const mutations = TOOL_DEFINITIONS.filter(definition => definition.capability !== 'read');
      expect(mutations).toHaveLength(35);
      for (const definition of mutations) {
        const result = await client.callTool({
          name: definition.name,
          arguments: SAFE_MUTATION_ARGUMENTS[definition.name]
        });
        expect(result.isError, definition.name).toBe(true);
        expect(result.structuredContent, definition.name).toMatchObject({
          error: { code: 'READ_ONLY_MODE', operation: definition.name, retryable: false }
        });
      }
      expect(invokedHandlers).toEqual([]);
    });
  });

  it('rejects all nine destructive tools when destruction is disabled before consent or runtime', async () => {
    await withPolicy({ readOnly: false, allowDestructive: false }, async (client, invokedHandlers) => {
      const destructive = TOOL_DEFINITIONS.filter(definition => definition.capability === 'destructive');
      expect(destructive).toHaveLength(9);
      for (const definition of destructive) {
        const result = await client.callTool({
          name: definition.name,
          arguments: SAFE_MUTATION_ARGUMENTS[definition.name]
        });
        expect(result.isError, definition.name).toBe(true);
        expect(result.structuredContent, definition.name).toMatchObject({
          error: { code: 'DESTRUCTIVE_OPERATIONS_DISABLED', operation: definition.name, retryable: false }
        });
      }
      expect(invokedHandlers).toEqual([]);
    });
  });
});
