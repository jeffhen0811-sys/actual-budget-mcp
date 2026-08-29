import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { describe, expect, it } from 'vitest';
import { TOOL_NAMES } from '../src/mcp/server.js';

describe('stdio entrypoint', () => {
  it('supports discovery in a child process with protocol-only stdout', async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['--import', 'tsx', 'src/index.ts'],
      cwd: process.cwd(),
      stderr: 'pipe'
    });
    const client = new Client({ name: 'stdio-smoke-test', version: '1.0.0' });
    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      expect(tools.map(tool => tool.name).sort()).toEqual([...TOOL_NAMES].sort());
    } finally {
      await client.close();
    }
  }, 20_000);
});
