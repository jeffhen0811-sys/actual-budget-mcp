import { mkdir } from 'node:fs/promises';
import { z } from 'zod/v4';

const environmentSchema = z
  .object({
    ACTUAL_SERVER_URL: z.url('ACTUAL_SERVER_URL must be a valid URL.'),
    ACTUAL_PASSWORD: z.string().trim().min(1, 'ACTUAL_PASSWORD is required.'),
    ACTUAL_SYNC_ID: z.string().trim().min(1, 'ACTUAL_SYNC_ID is required.'),
    ACTUAL_ENCRYPTION_PASSWORD: z.string().min(1).optional(),
    ACTUAL_DATA_DIR: z.string().trim().min(1).default('/tmp/actual-budget-mcp')
  })
  .strict();

export interface ActualConfig {
  serverUrl: string;
  password: string;
  syncId: string;
  encryptionPassword?: string;
  dataDir: string;
}

export async function loadConfig(env: NodeJS.ProcessEnv = process.env): Promise<ActualConfig> {
  const parsed = environmentSchema.parse({
    ACTUAL_SERVER_URL: env.ACTUAL_SERVER_URL,
    ACTUAL_PASSWORD: env.ACTUAL_PASSWORD,
    ACTUAL_SYNC_ID: env.ACTUAL_SYNC_ID,
    ACTUAL_ENCRYPTION_PASSWORD: env.ACTUAL_ENCRYPTION_PASSWORD,
    ACTUAL_DATA_DIR: env.ACTUAL_DATA_DIR
  });
  await mkdir(parsed.ACTUAL_DATA_DIR, { recursive: true });
  return {
    serverUrl: parsed.ACTUAL_SERVER_URL,
    password: parsed.ACTUAL_PASSWORD,
    syncId: parsed.ACTUAL_SYNC_ID,
    ...(parsed.ACTUAL_ENCRYPTION_PASSWORD === undefined
      ? {}
      : { encryptionPassword: parsed.ACTUAL_ENCRYPTION_PASSWORD }),
    dataDir: parsed.ACTUAL_DATA_DIR
  };
}

export function sanitizeServerUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '[invalid-server-url]';
  }
}
