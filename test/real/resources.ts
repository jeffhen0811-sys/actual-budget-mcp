import { assertPayeeWriteAllowed, assertTransferPairOwned } from './ownership.js';

export type OwnedResourceKind = 'transaction' | 'schedule' | 'rule' | 'payee' | 'category' | 'categoryGroup' | 'account';

export interface OwnedResource {
  kind: OwnedResourceKind;
  id: string;
  name: string;
}
export interface OwnedTransferPair {
  kind: 'transferPair';
  id: string;
  name: string;
  transactionIds: [string, string];
}

export type ResourceCleaners = Record<OwnedResourceKind, (resource: OwnedResource) => Promise<void>> & {
  verifyTransactionsAbsent?: (transactionIds: readonly [string, string]) => Promise<void>;
};

const CLEANUP_ORDER: readonly OwnedResourceKind[] = ['transaction', 'schedule', 'rule', 'payee', 'category', 'categoryGroup', 'account'];

function cleanupErrorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN';
}

function provesExactResourceAbsent(error: unknown): boolean {
  const code = cleanupErrorCode(error);
  return code === 'NOT_FOUND' || code === 'SCHEDULE_NOT_FOUND';
}

export class ResourceRegistry {
  private readonly resources: OwnedResource[] = [];
  private readonly transferPairs: OwnedTransferPair[] = [];

  register(kind: OwnedResourceKind, id: string, name: string): void {
    if (!id) throw new Error(`Cannot register ${kind} without an exact returned ID.`);
    if (kind === 'payee') assertPayeeWriteAllowed(name, 'register');
    if (!this.resources.some(resource => resource.kind === kind && resource.id === id)) this.resources.push({ kind, id, name });
  }

  registerTransferPair(pairKey: string, transactionIds: readonly string[], name: string): void {
    assertTransferPairOwned(pairKey, transactionIds);
    const sorted = [...transactionIds].sort() as [string, string];
    if (!this.transferPairs.some(pair => pair.id === pairKey)) this.transferPairs.push({
      kind: 'transferPair', id: pairKey, name, transactionIds: sorted
    });
  }

  release(kind: OwnedResourceKind, id: string): void {
    const index = this.resources.findIndex(resource => resource.kind === kind && resource.id === id);
    if (index !== -1) this.resources.splice(index, 1);
  }

  releaseTransferPair(pairKey: string): void {
    const index = this.transferPairs.findIndex(pair => pair.id === pairKey);
    if (index !== -1) this.transferPairs.splice(index, 1);
  }

  snapshot(): Array<OwnedResource | OwnedTransferPair> {
    return [
      ...this.transferPairs.map(pair => ({ ...pair, transactionIds: [...pair.transactionIds] as [string, string] })),
      ...this.resources.map(resource => ({ ...resource }))
    ];
  }

  assertEmpty(): void {
    if (this.resources.length === 0 && this.transferPairs.length === 0) return;
    const leftovers = [
      ...this.transferPairs.map(pair => `transferPair id=${pair.id} transactionIds=${pair.transactionIds.join(',')} name=${pair.name}`),
      ...this.resources.map(resource => `${resource.kind} id=${resource.id} name=${resource.name}`)
    ].join('; ');
    throw new Error(`Owned temporary resources remain; manual cleanup required for: ${leftovers}`);
  }

  async cleanup(cleaners: ResourceCleaners): Promise<void> {
    const failures: string[] = [];
    for (const pair of [...this.transferPairs].reverse()) {
      try {
        if (!cleaners.verifyTransactionsAbsent) throw new Error('Transfer cleanup requires exact two-ID absence verification.');
        await cleaners.transaction({ kind: 'transaction', id: pair.transactionIds[0], name: pair.name });
        await cleaners.verifyTransactionsAbsent(pair.transactionIds);
        this.transferPairs.splice(this.transferPairs.findIndex(item => item.id === pair.id), 1);
      } catch (error) {
        const errorCode = cleanupErrorCode(error);
        if (provesExactResourceAbsent(error) && cleaners.verifyTransactionsAbsent) {
          try {
            await cleaners.verifyTransactionsAbsent(pair.transactionIds);
            this.transferPairs.splice(this.transferPairs.findIndex(item => item.id === pair.id), 1);
            continue;
          } catch (verificationError) {
            failures.push(`transferPair id=${pair.id} transactionIds=${pair.transactionIds.join(',')} name=${pair.name} errorCode=${cleanupErrorCode(verificationError)}`);
            continue;
          }
        }
        failures.push(`transferPair id=${pair.id} transactionIds=${pair.transactionIds.join(',')} name=${pair.name} errorCode=${errorCode}`);
      }
    }
    for (const kind of CLEANUP_ORDER) {
      for (const resource of this.resources.filter(item => item.kind === kind).reverse()) {
        try {
          await cleaners[resource.kind](resource);
          this.release(resource.kind, resource.id);
        } catch (error) {
          const errorCode = cleanupErrorCode(error);
          if (provesExactResourceAbsent(error)) {
            this.release(resource.kind, resource.id);
            continue;
          }
          failures.push(`${resource.kind} id=${resource.id} name=${resource.name} errorCode=${errorCode}`);
        }
      }
    }
    if (failures.length) throw new Error(`Exact-ID cleanup failed; manual cleanup required for: ${failures.join('; ')}`);
  }
}
