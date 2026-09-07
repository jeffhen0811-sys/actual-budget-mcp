import { readFile } from 'node:fs/promises';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { createLogger } from '../src/logger.js';
import {
  checkContractCompatibility,
  type ReviewedInputLimit,
  type ToolContract,
  type ToolContractSnapshot
} from '../src/mcp/contract-compatibility.js';
import { createMcpServer, type ToolRuntime } from '../src/mcp/server.js';
import { MCP_VERSION } from '../src/version.js';

const BASELINE_PATH = 'test/fixtures/contracts/v0.7.0-tool-discovery.json';
const REVIEWED_LIMITS_PATH = 'test/fixtures/contracts/v1.0.0-reviewed-input-limits.json';

async function discoverCurrentTools(): Promise<ToolContract[]> {
  const unavailable = async () => {
    throw new Error('The compatibility checker must never execute a tool handler.');
  };
  const runtime = new Proxy({}, { get: () => unavailable }) as ToolRuntime;
  const server = createMcpServer(runtime, createLogger([], () => undefined), {
    readOnly: false,
    allowDestructive: true
  });
  const client = new Client({ name: 'contract-compatibility-check', version: MCP_VERSION });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const tools: ToolContract[] = [];
    let cursor: string | undefined;
    do {
      const result = await client.listTools(cursor ? { cursor } : undefined);
      tools.push(...result.tools as ToolContract[]);
      cursor = result.nextCursor;
    } while (cursor);
    return tools;
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}

const baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf8')) as ToolContractSnapshot;
const reviewed = JSON.parse(await readFile(REVIEWED_LIMITS_PATH, 'utf8')) as { limits: ReviewedInputLimit[] };
const issues = checkContractCompatibility(baseline, await discoverCurrentTools(), {
  reviewedInputLimits: reviewed.limits
});
if (issues.length > 0) {
  for (const issue of issues) {
    process.stderr.write(`${issue.tool ? `${issue.tool}: ` : ''}${issue.area} ${issue.message}\n`);
  }
  process.exitCode = 1;
} else {
  process.stderr.write(`Compatible with ${baseline.baselineVersion} baseline: ${baseline.toolCount} tools verified.\n`);
}
