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

export function assertTransferPairOwned(pairKey: string, transactionIds: readonly string[]): asserts transactionIds is readonly [string, string] {
  if (!/^v1:[a-f0-9]{64}$/.test(pairKey)) throw new Error('Cannot register a transfer pair without a canonical pair key.');
  if (transactionIds.length !== 2 || transactionIds.some(id => !id.trim()) || transactionIds[0] === transactionIds[1]) {
    throw new Error('A transfer cleanup unit requires two distinct exact transaction IDs.');
  }
}
