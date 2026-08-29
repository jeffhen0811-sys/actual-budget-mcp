import { redact } from './redaction.js';

export interface Logger {
  info(message: string, details?: Record<string, unknown>): void;
  error(message: string, details?: Record<string, unknown>): void;
}

function serialize(level: string, message: string, details: Record<string, unknown> | undefined, secrets: readonly (string | undefined)[]): string {
  return `${JSON.stringify({ timestamp: new Date().toISOString(), level, message: redact(message, secrets), ...(details ? { details } : {}) }, (_key, value) =>
    typeof value === 'string' ? redact(value, secrets) : value
  )}\n`;
}

export function createLogger(secrets: readonly (string | undefined)[] = [], write: (text: string) => void = text => process.stderr.write(text)): Logger {
  return {
    info: (message, details) => write(serialize('info', message, details, secrets)),
    error: (message, details) => write(serialize('error', message, details, secrets))
  };
}

export function protectStdout(): void {
  console.log = (...args: unknown[]) => process.stderr.write(`${args.map(String).join(' ')}\n`);
  console.info = console.log;
  console.debug = console.log;
  console.warn = (...args: unknown[]) => process.stderr.write(`${args.map(String).join(' ')}\n`);
  console.error = console.warn;
}
