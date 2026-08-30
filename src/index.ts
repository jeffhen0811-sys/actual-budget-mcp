#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { ActualClient } from './actual/client.js';
import { actualApiAdapter } from './actual/adapter.js';
import { createLogger, protectStdout } from './logger.js';
import { createMcpServer } from './mcp/server.js';

protectStdout();
const logger = createLogger();
const runtime = new ActualClient(actualApiAdapter, undefined, logger);
const handle = serveStdio(() => createMcpServer(runtime, logger), {
  onerror: error => logger.error('MCP stdio transport error.', { message: error.message })
});

let stopping: Promise<void> | undefined;
async function stop(signal: string): Promise<void> {
  if (stopping) return stopping;
  stopping = (async () => {
    logger.info('Shutting down Actual Budget MCP.', { signal });
    await runtime.shutdown();
    await handle.close();
  })();
  return stopping;
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void stop(signal).finally(() => process.exit(0));
  });
}

process.stdin.once('end', () => {
  void stop('STDIN_EOF').finally(() => process.exit(0));
});
