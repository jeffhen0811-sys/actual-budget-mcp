import { describe, expect, it } from 'vitest';
import { loadOperationalConfig } from '../src/config.js';
import { annotationsFor, enforceToolPolicy, TOOL_REGISTRY } from '../src/mcp/tool-registry.js';
import { FifoQueue } from '../src/actual/queue.js';
import { readFile } from 'node:fs/promises';
import { ACTUAL_SDK_VERSION, MCP_VERSION } from '../src/version.js';

describe('central capability policy and telemetry foundations', () => {
  it('parses only explicit operational booleans with backwards-compatible defaults', () => {
    expect(loadOperationalConfig({})).toEqual({ readOnly: false, allowDestructive: true });
    expect(loadOperationalConfig({ ACTUAL_MCP_READ_ONLY: 'true', ACTUAL_MCP_ALLOW_DESTRUCTIVE: 'false' })).toEqual({ readOnly: true, allowDestructive: false });
    expect(() => loadOperationalConfig({ ACTUAL_MCP_READ_ONLY: '1' })).toThrow('ACTUAL_MCP_READ_ONLY');
  });

  it('classifies every tool exactly once and preserves the existing 32/8 guard counts', () => {
    expect(TOOL_REGISTRY).toHaveLength(62);
    expect(new Set(TOOL_REGISTRY.map(item => item.name)).size).toBe(62);
    expect(TOOL_REGISTRY.slice(0, 53).filter(item => item.capability !== 'read')).toHaveLength(32);
    expect(TOOL_REGISTRY.slice(0, 53).filter(item => item.capability === 'destructive')).toHaveLength(8);
    for (const definition of TOOL_REGISTRY) expect(annotationsFor(definition)).toMatchObject({
      readOnlyHint: definition.capability === 'read', destructiveHint: definition.capability === 'destructive', idempotentHint: definition.idempotent
    });
  });

  it('applies read-only before destructive-disabled and permits reads', () => {
    const read = TOOL_REGISTRY.find(item => item.name === 'actual_health')!;
    const write = TOOL_REGISTRY.find(item => item.name === 'actual_sync')!;
    const destructive = TOOL_REGISTRY.find(item => item.name === 'actual_delete_schedule')!;
    expect(() => enforceToolPolicy(read, { readOnly: true, allowDestructive: false })).not.toThrow();
    expect(() => enforceToolPolicy(write, { readOnly: true, allowDestructive: false })).toThrow(expect.objectContaining({ code: 'READ_ONLY_MODE' }));
    expect(() => enforceToolPolicy(destructive, { readOnly: true, allowDestructive: false })).toThrow(expect.objectContaining({ code: 'READ_ONLY_MODE' }));
    expect(() => enforceToolPolicy(destructive, { readOnly: false, allowDestructive: false })).toThrow(expect.objectContaining({ code: 'DESTRUCTIVE_OPERATIONS_DISABLED' }));
  });

  it('reports only active operation name and queued count', async () => {
    const queue = new FifoQueue();
    let release!: () => void;
    const first = queue.run('actual_first', () => new Promise<void>(resolve => { release = resolve; }));
    const second = queue.run('actual_second', async () => undefined);
    await Promise.resolve();
    expect(queue.snapshot()).toEqual({ queuedCount: 1, activeOperation: 'actual_first' });
    release();
    await Promise.all([first, second]);
    expect(queue.snapshot()).toEqual({ queuedCount: 0 });
  });

  it('keeps package and pinned SDK versions consistent with the single runtime source', async () => {
    const manifest = JSON.parse(await readFile('package.json', 'utf8')) as { version: string; dependencies: Record<string, string> };
    expect(MCP_VERSION).toBe(manifest.version);
    expect(ACTUAL_SDK_VERSION).toBe(manifest.dependencies['@actual-app/api']);
  });
});
