export type OwnedResourceKind = 'transaction' | 'category' | 'categoryGroup' | 'account';

export interface OwnedResource {
  kind: OwnedResourceKind;
  id: string;
  name: string;
}

export type ResourceCleaners = Record<OwnedResourceKind, (resource: OwnedResource) => Promise<void>>;

export class ResourceRegistry {
  private readonly resources: OwnedResource[] = [];

  register(kind: OwnedResourceKind, id: string, name: string): void {
    if (!id) throw new Error(`Cannot register ${kind} without an exact returned ID.`);
    if (!this.resources.some(resource => resource.kind === kind && resource.id === id)) this.resources.push({ kind, id, name });
  }

  release(kind: OwnedResourceKind, id: string): void {
    const index = this.resources.findIndex(resource => resource.kind === kind && resource.id === id);
    if (index !== -1) this.resources.splice(index, 1);
  }

  snapshot(): OwnedResource[] {
    return this.resources.map(resource => ({ ...resource }));
  }

  async cleanup(cleaners: ResourceCleaners): Promise<void> {
    const failures: string[] = [];
    for (const resource of [...this.resources].reverse()) {
      try {
        await cleaners[resource.kind](resource);
        this.release(resource.kind, resource.id);
      } catch (error) {
        const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN';
        failures.push(`${resource.kind} id=${resource.id} name=${resource.name} errorCode=${errorCode}`);
      }
    }
    if (failures.length) throw new Error(`Exact-ID cleanup failed; manual cleanup required for: ${failures.join('; ')}`);
  }
}
