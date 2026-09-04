export class FifoQueue {
  private tail: Promise<void> = Promise.resolve();
  private closed = false;
  private queued = 0;
  private activeOperation: string | undefined;

  run<T>(operation: string, action: () => Promise<T>): Promise<T>;
  run<T>(action: () => Promise<T>): Promise<T>;
  run<T>(operationOrAction: string | (() => Promise<T>), maybeAction?: () => Promise<T>): Promise<T> {
    if (this.closed) return Promise.reject(new Error('The Actual operation queue is closed.'));
    const name = typeof operationOrAction === 'string' ? operationOrAction : undefined;
    const action = typeof operationOrAction === 'string' ? maybeAction! : operationOrAction;
    this.queued += 1;
    const result = this.tail.then(async () => {
      this.queued -= 1;
      this.activeOperation = name;
      try { return await action(); }
      finally { this.activeOperation = undefined; }
    });
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }

  snapshot(): { queuedCount: number; activeOperation?: string } {
    return {
      queuedCount: this.queued,
      ...(this.activeOperation === undefined ? {} : { activeOperation: this.activeOperation })
    };
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.tail;
  }
}
