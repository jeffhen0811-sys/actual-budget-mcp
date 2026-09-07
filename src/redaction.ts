const REDACTED = '[REDACTED]';

export function redact(value: string, secrets: readonly (string | undefined)[] = []): string {
  let result = value;
  for (const secret of secrets) {
    if (secret) result = result.split(secret).join(REDACTED);
  }
  result = result
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, `$1${REDACTED}@`)
    .replace(/\b(password|passwd|token|secret|api[_-]?key|encryption[_-]?password|sync[_-]?id|data[_-]?dir|file[_-]?path)\s*[=:]\s*[^\s,;]+/gi, `$1=${REDACTED}`)
    .replace(/\b(ACTUAL_(?:PASSWORD|SYNC_ID|ENCRYPTION_PASSWORD|DATA_DIR|SERVER_URL))\s*=\s*[^\s,;]+/gi, `$1=${REDACTED}`)
    .replace(/(?:\/Users\/|\/home\/|\/private\/|\/var\/folders\/)[^\s,;]+/g, '[REDACTED_PATH]')
    .replace(/[A-Za-z]:\\Users\\[^\s,;]+/g, '[REDACTED_PATH]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, `Bearer ${REDACTED}`)
    .replace(/\n\s*at\s+.*$/gms, '');
  return result;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
