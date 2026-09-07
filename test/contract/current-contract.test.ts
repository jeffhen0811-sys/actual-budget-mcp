import { readFile } from 'node:fs/promises';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { describe, expect, it } from 'vitest';
import { createLogger } from '../../src/logger.js';
import {
  checkContractCompatibility,
  type ReviewedInputLimit,
  type ToolContract,
  type ToolContractSnapshot
} from '../../src/mcp/contract-compatibility.js';
import { createMcpServer, type ToolRuntime } from '../../src/mcp/server.js';

describe('current public contract', () => {
  it('matches every current tool against the frozen v0.7.0 contract', async () => {
    const baseline = JSON.parse(
      await readFile('test/fixtures/contracts/v0.7.0-tool-discovery.json', 'utf8')
    ) as ToolContractSnapshot;
    const reviewed = JSON.parse(
      await readFile('test/fixtures/contracts/v1.0.0-reviewed-input-limits.json', 'utf8')
    ) as { limits: ReviewedInputLimit[] };
    const unavailable = async () => {
      throw new Error('Contract discovery must not invoke a runtime handler.');
    };
    const runtime = new Proxy({}, { get: () => unavailable }) as ToolRuntime;
    const server = createMcpServer(runtime, createLogger([], () => undefined), {
      readOnly: false,
      allowDestructive: true
    });
    const client = new Client({ name: 'current-contract-test', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const { tools } = await client.listTools();
      expect(checkContractCompatibility(baseline, tools as ToolContract[], {
        reviewedInputLimits: reviewed.limits
      })).toEqual([]);
    } finally {
      await Promise.all([client.close(), server.close()]);
    }
  });
});
