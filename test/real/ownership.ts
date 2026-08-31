export const TEMPORARY_TEST_PAYEE = 'MCP INTEGRATION TEST';
export const PERMANENT_TEST_PAYEES = [
  'Empresa Teste',
  'Supermercado Teste',
  'Companhia de Energia Teste',
  'Posto Teste',
  'Netflix Teste',
  'Restaurante Teste',
  'Loja Online Teste'
] as const;
const permanentPayees = new Set<string>(PERMANENT_TEST_PAYEES);

function normalizePayeeCase(value: string): string {
  return value.normalize('NFKC').trim().toLocaleUpperCase('en-US');
}

export function matchesTemporaryTestPayee(payeeName: string | undefined, importedPayee: string | null | undefined): boolean {
  return importedPayee === TEMPORARY_TEST_PAYEE &&
    payeeName !== undefined &&
    normalizePayeeCase(payeeName) === normalizePayeeCase(TEMPORARY_TEST_PAYEE);
}

export function assertPayeeWriteAllowed(payeeName: string, action: 'register' | 'rename' | 'delete' | 'merge' | 'reuse'): void {
  if (permanentPayees.has(payeeName)) {
    throw new Error(`Refusing to ${action} permanent payee fixture name=${payeeName}.`);
  }
}
