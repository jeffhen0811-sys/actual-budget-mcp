export const TEMPORARY_TEST_PAYEE = 'MCP INTEGRATION TEST';

function normalizePayeeCase(value: string): string {
  return value.normalize('NFKC').trim().toLocaleUpperCase('en-US');
}

export function matchesTemporaryTestPayee(payeeName: string | undefined, importedPayee: string | null | undefined): boolean {
  return importedPayee === TEMPORARY_TEST_PAYEE &&
    payeeName !== undefined &&
    normalizePayeeCase(payeeName) === normalizePayeeCase(TEMPORARY_TEST_PAYEE);
}
