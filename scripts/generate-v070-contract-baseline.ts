import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { createLogger } from '../src/logger.js';
import { createMcpServer, type ToolRuntime } from '../src/mcp/server.js';

const SOURCE_COMMIT = 'c5b752a5f7f3067a40480f72078907c72ad26c66';
const OUTPUT_PATH = 'test/fixtures/contracts/v0.7.0-tool-discovery.json';
const PUBLIC_SOURCE_PATHS = ['src'];

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function assertBaselineSourceIsUnchanged(): void {
  const resolved = git('rev-parse', `${SOURCE_COMMIT}^{commit}`);
  if (resolved !== SOURCE_COMMIT) {
    throw new Error(`The recorded v0.7.0 source commit did not resolve exactly: ${resolved}`);
  }

  try {
    execFileSync('git', ['diff', '--quiet', SOURCE_COMMIT, '--', ...PUBLIC_SOURCE_PATHS]);
  } catch {
    throw new Error(
      `Refusing to generate the v0.7.0 baseline because ${PUBLIC_SOURCE_PATHS.join(', ')} differ from ${SOURCE_COMMIT}.`
    );
  }

  const baselinePackage = JSON.parse(git('show', `${SOURCE_COMMIT}:package.json`)) as {
    version?: string;
    dependencies?: Record<string, string>;
  };
  if (baselinePackage.version !== '0.7.0' || baselinePackage.dependencies?.['@actual-app/api'] !== '26.8.1') {
    throw new Error('The recorded source commit is not the expected v0.7.0 / Actual SDK 26.8.1 baseline.');
  }
}

function normalize(value: unknown): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalize(item)])
    );
  }
  throw new Error(`Cannot normalize non-JSON value of type ${typeof value}.`);
}

async function discoverTools() {
  const unavailable = async () => {
    throw new Error('The contract snapshot runtime must never execute a tool handler.');
  };
  const runtime = new Proxy({}, { get: () => unavailable }) as ToolRuntime;
  const server = createMcpServer(runtime, createLogger([], () => undefined), {
    readOnly: false,
    allowDestructive: true
  });
  const client = new Client({ name: 'v070-contract-snapshot', version: '0.7.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const tools = [];
    let cursor: string | undefined;
    do {
      const result = await client.listTools(cursor ? { cursor } : undefined);
      tools.push(...result.tools);
      cursor = result.nextCursor;
    } while (cursor);
    return tools;
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}

assertBaselineSourceIsUnchanged();
const tools = (await discoverTools()).sort((left, right) => left.name.localeCompare(right.name));
if (tools.length !== 62 || new Set(tools.map(tool => tool.name)).size !== 62) {
  throw new Error(`Expected 62 unique v0.7.0 tools, received ${tools.length}.`);
}

const snapshot = normalize({
  formatVersion: 1,
  baselineVersion: '0.7.0',
  sourceCommit: SOURCE_COMMIT,
  toolCount: tools.length,
  tools: tools.map(tool => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    annotations: tool.annotations,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema
  }))
});

await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
process.stderr.write(`Wrote ${tools.length}-tool v0.7.0 contract baseline to ${OUTPUT_PATH}.\n`);
