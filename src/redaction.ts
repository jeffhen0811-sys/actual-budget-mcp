const REDACTED = '[REDACTED]';

export function redact(value: string, secrets: readonly (string | undefined)[] = []): string {
  let result = value;
  for (const secret of secrets) {
    if (secret) result = result.split(secret).join(REDACTED);
  }
  result = result
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, `$1${REDACTED}@`)
    .replace(/\b(password|passwd|token|secret|api[_-]?key|encryption[_-]?password)\s*[=:]\s*[^\s,;]+/gi, `$1=${REDACTED}`)
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, `Bearer ${REDACTED}`)
    .replace(/\n\s*at\s+.*$/gms, '');
  return result;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
