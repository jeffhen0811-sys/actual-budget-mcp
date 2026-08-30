import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import type { ActualConfig } from '../../src/config.js';
import { loadConfig } from '../../src/config.js';

export const INTEGRATION_ENV_FILE = resolve('.env.integration.local');
export const REQUIRED_TEST_ACCOUNT_NAME = 'TESTE MCP - Conta Corrente';
export const CARD_TEST_ACCOUNT_NAME = 'TESTE MCP - Cartão';

let loaded = false;

export interface RealTestEnvironment {
  configured: boolean;
  allowWrites: boolean;
  accountName: string;
  missing: string[];
}

export async function loadRealTestEnvironment(): Promise<RealTestEnvironment> {
  if (!loaded) {
    loaded = true;
    try {
      await access(INTEGRATION_ENV_FILE);
      loadEnvFile(INTEGRATION_ENV_FILE);
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : '';
      if (code !== 'ENOENT') throw error;
    }
  }

  const required = ['ACTUAL_SERVER_URL', 'ACTUAL_PASSWORD', 'ACTUAL_SYNC_ID'] as const;
  const missing = required.filter(name => !process.env[name]?.trim());
  return {
    configured: missing.length === 0,
    allowWrites: process.env.ACTUAL_INTEGRATION_ALLOW_WRITES === 'true',
    accountName: process.env.ACTUAL_INTEGRATION_TEST_ACCOUNT_NAME?.trim() || REQUIRED_TEST_ACCOUNT_NAME,
    missing
  };
}

export async function integrationConfig(dataDir = '.actual-test-data/integration'): Promise<ActualConfig> {
  return loadConfig({ ...process.env, ACTUAL_DATA_DIR: resolve(dataDir) });
}

export function skipMessage(environment: RealTestEnvironment, suite: string): string {
  if (environment.configured) return `${suite} is configured.`;
  return `${suite} skipped: create .env.integration.local from .env.integration.local.example; missing ${environment.missing.join(', ')}.`;
}

export function childProcessEnvironment(dataDir: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries({ ...process.env, ACTUAL_DATA_DIR: resolve(dataDir) }).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
}
