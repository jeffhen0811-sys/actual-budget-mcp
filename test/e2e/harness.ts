import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { isDeepStrictEqual } from 'node:util';
import type { ZodType } from 'zod/v4';
import { childProcessEnvironment } from '../real/env.js';

export interface RunningMcp {
  client: Client;
  transport: StdioClientTransport;
  stderr(): string;
  close(): Promise<void>;
}

export async function startMcp(dataDir: string): Promise<RunningMcp> {
  let capturedStderr = '';
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['dist/index.js'],
    cwd: process.cwd(),
    env: childProcessEnvironment(dataDir),
    stderr: 'pipe'
  });
  transport.stderr?.on('data', chunk => { capturedStderr += String(chunk); });
  const client = new Client({ name: 'actual-budget-mcp-e2e', version: '1.0.0' });
  await client.connect(transport);
  return {
    client,
    transport,
    stderr: () => capturedStderr,
    close: async () => { await client.close(); }
  };
}

export async function callTool<T>(running: RunningMcp, name: string, args: Record<string, unknown>, schema: ZodType<T>): Promise<T> {
  const result = await running.client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(`MCP tool ${name} failed: ${JSON.stringify(result.structuredContent ?? result.content)}`);
  const text = result.content.find(item => item.type === 'text');
  if (!text || text.type !== 'text') throw new Error(`MCP tool ${name} returned no JSON text content.`);
  const textual = schema.parse(JSON.parse(text.text) as unknown);
  const structured = schema.parse(result.structuredContent);
  if (!isDeepStrictEqual(textual, structured)) {
    throw new Error(`MCP tool ${name} returned mismatched textual and structured content.`);
  }
  return structured;
}

export async function callToolExpectingError(running: RunningMcp, name: string, args: Record<string, unknown>) {
  const result = await running.client.callTool({ name, arguments: args });
  if (!result.isError) throw new Error(`Expected MCP tool ${name} to return an error.`);
  return result;
}

export function assertNoConfiguredSecrets(value: unknown): void {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  for (const secret of [process.env.ACTUAL_PASSWORD, process.env.ACTUAL_SYNC_ID]) {
    if (secret && serialized.includes(secret)) throw new Error('MCP output exposed a configured credential.');
  }
}
