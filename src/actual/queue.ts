export class FifoQueue {
  private tail: Promise<void> = Promise.resolve();
  private closed = false;

  run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.closed) return Promise.reject(new Error('The Actual operation queue is closed.'));
    const result = this.tail.then(operation);
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.tail;
  }
}
