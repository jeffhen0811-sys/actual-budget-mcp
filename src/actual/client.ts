import { open, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { ActualConfig } from '../config.js';
import { loadConfig, sanitizeServerUrl } from '../config.js';
import { mapError, PublicError } from '../errors.js';
import type { Logger } from '../logger.js';
import { createLogger } from '../logger.js';
import { errorMessage, redact } from '../redaction.js';
import { MAX_TRANSACTION_RESULTS } from '../schemas.js';
import type { ActualApiAdapter, AdapterTransaction, ImportTransaction } from './adapter.js';
import { FifoQueue } from './queue.js';

export interface PublicAccount {
  id: string;
  name: string;
  offbudget: boolean;
  closed: boolean;
  balance?: number;
  balanceError?: string;
}

export interface RuntimeHealth {
  connected: boolean;
  server: string;
  budgetLoaded: boolean;
  version?: string;
  diagnosticCode?: string;
}

export class ActualClient {
  private readonly queue = new FifoQueue();
  private config: ActualConfig | undefined;
  private initialization: Promise<void> | undefined;
  private ready = false;
  private lockPath: string | undefined;
  private shutdownPromise: Promise<void> | undefined;

  constructor(
    private readonly api: ActualApiAdapter,
    private readonly configLoader: () => Promise<ActualConfig> = () => loadConfig(),
    private readonly logger: Logger = createLogger()
  ) {}

  private secrets(): Array<string | undefined> {
    return [this.config?.password, this.config?.encryptionPassword];
  }

  private async acquireCacheLock(dataDir: string): Promise<void> {
    const lockPath = join(dataDir, '.actual-budget-mcp.lock');
    try {
      const handle = await open(lockPath, 'wx', 0o600);
      await handle.writeFile(`${process.pid}\n`, 'utf8');
      await handle.close();
      this.lockPath = lockPath;
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : '';
      if (code === 'EEXIST') {
        throw new PublicError('CACHE_IN_USE', 'Another process is already using this Actual cache directory.', 'initialize', false);
      }
      throw error;
    }
  }

  private async releaseCacheLock(): Promise<void> {
    if (!this.lockPath) return;
    const path = this.lockPath;
    this.lockPath = undefined;
    await unlink(path).catch(() => undefined);
  }

  private async initialize(): Promise<void> {
    this.config = await this.configLoader();
    await this.acquireCacheLock(this.config.dataDir);
    try {
      await this.api.init({
        dataDir: this.config.dataDir,
        serverURL: this.config.serverUrl,
        password: this.config.password,
        verbose: false
      });
      await this.api.downloadBudget(
        this.config.syncId,
        this.config.encryptionPassword === undefined ? undefined : { password: this.config.encryptionPassword }
      );
      this.ready = true;
    } catch (error) {
      await this.api.shutdown().catch(() => undefined);
      await this.releaseCacheLock();
      throw mapError(error, 'initialize', this.secrets());
    }
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) return;
    if (!this.initialization) {
      this.initialization = this.initialize().finally(() => {
        if (!this.ready) this.initialization = undefined;
      });
    }
    await this.initialization;
  }

  private run<T>(operation: string, action: () => Promise<T>): Promise<T> {
    return this.queue.run(async () => {
      try {
        await this.ensureReady();
        return await action();
      } catch (error) {
        throw mapError(error, operation, this.secrets());
      }
    });
  }

  async health(): Promise<RuntimeHealth> {
    return this.queue.run(async () => {
      try {
        await this.ensureReady();
        const status = await this.api.getServerVersion();
        if ('version' in status && status.version) {
          return {
            connected: true,
            server: sanitizeServerUrl(this.config!.serverUrl),
            budgetLoaded: this.ready,
            version: status.version
          };
        }
        return {
          connected: false,
          server: sanitizeServerUrl(this.config!.serverUrl),
          budgetLoaded: this.ready,
          diagnosticCode: status.error ?? 'SERVER_UNAVAILABLE'
        };
      } catch (error) {
        const mapped = mapError(error, 'actual_health', this.secrets());
        return {
          connected: false,
          server: this.config ? sanitizeServerUrl(this.config.serverUrl) : '[not-configured]',
          budgetLoaded: this.ready,
          diagnosticCode: mapped.code
        };
      }
    });
  }

  sync(): Promise<{ success: true; synchronizedAt: string }> {
    return this.run('actual_sync', async () => {
      await this.api.sync();
      return { success: true, synchronizedAt: new Date().toISOString() };
    });
  }

  listAccounts(): Promise<PublicAccount[]> {
    return this.run('actual_list_accounts', async () => {
      const accounts = await this.api.getAccounts();
      const output: PublicAccount[] = [];
      for (const account of accounts) {
        const normalized: PublicAccount = {
          id: account.id,
          name: account.name,
          offbudget: account.offbudget ?? false,
          closed: account.closed ?? false
        };
        try {
          normalized.balance = await this.api.getAccountBalance(account.id);
        } catch (error) {
          normalized.balanceError = redact(errorMessage(error), this.secrets()) || 'Balance unavailable.';
        }
        output.push(normalized);
      }
      return output;
    });
  }

  async getAccount(accountId: string): Promise<PublicAccount> {
    const accounts = await this.listAccounts();
    const account = accounts.find(item => item.id === accountId);
    if (!account) throw new PublicError('NOT_FOUND', 'The requested account was not found.', 'actual_get_account', false);
    return account;
  }

  listCategories() {
    return this.run('actual_list_categories', async () =>
      (await this.api.getCategoryGroups()).map(group => ({
        groupId: group.id,
        groupName: group.name,
        categories: (group.categories ?? []).map(category => ({ id: category.id, name: category.name, hidden: category.hidden ?? false }))
      }))
    );
  }

  listPayees() {
    return this.run('actual_list_payees', async () => (await this.api.getPayees()).map(payee => ({ id: payee.id, name: payee.name })));
  }

  getTransactions(accountId: string, startDate: string, endDate: string) {
    return this.run('actual_get_transactions', async () => {
      const transactions = await this.api.getTransactions(accountId, startDate, endDate);
      if (transactions.length > MAX_TRANSACTION_RESULTS) {
        throw new PublicError(
          'RESULT_TOO_LARGE',
          `The result exceeds ${MAX_TRANSACTION_RESULTS} transactions. Request a narrower date range.`,
          'actual_get_transactions',
          false
        );
      }
      return transactions.map(transaction => this.projectTransaction(transaction));
    });
  }

  private projectTransaction(transaction: AdapterTransaction) {
    return {
      id: transaction.id,
      account: transaction.account,
      date: transaction.date,
      amount: transaction.amount,
      ...(transaction.payee === undefined ? {} : { payee: transaction.payee }),
      ...(transaction.category === undefined ? {} : { category: transaction.category }),
      ...(transaction.notes === undefined ? {} : { notes: transaction.notes }),
      ...(transaction.cleared === undefined ? {} : { cleared: transaction.cleared }),
      ...(transaction.reconciled === undefined ? {} : { reconciled: transaction.reconciled }),
      ...(transaction.imported_id === undefined ? {} : { imported_id: transaction.imported_id }),
      ...(transaction.imported_payee === undefined ? {} : { imported_payee: transaction.imported_payee }),
      ...(transaction.transfer_id === undefined ? {} : { transfer_id: transaction.transfer_id }),
      ...(transaction.starting_balance_flag === undefined ? {} : { starting_balance_flag: transaction.starting_balance_flag })
    };
  }

  private mutate<T>(operation: string, mutation: () => Promise<T>): Promise<T> {
    return this.run(operation, async () => {
      const result = await mutation();
      try {
        await this.api.sync();
      } catch (error) {
        this.logger.error('Synchronization failed after a local mutation.', { operation });
        throw new PublicError(
          'MUTATION_SYNC_FAILED',
          'The local change succeeded, but synchronization failed. Run actual_sync before retrying the mutation.',
          operation,
          true,
          { cause: error }
        );
      }
      return result;
    });
  }

  importTransactions(accountId: string, transactions: Omit<ImportTransaction, 'account'>[]) {
    return this.mutate('actual_import_transactions', async () => {
      const result = await this.api.importTransactions(
        accountId,
        transactions.map(transaction => ({ ...transaction, account: accountId })),
        { reimportDeleted: false }
      );
      return {
        added: result.added,
        updated: result.updated,
        errors: result.errors.map(error => ({ message: redact(error.message, this.secrets()) }))
      };
    });
  }

  updateTransaction(transactionId: string, fields: Partial<AdapterTransaction>) {
    return this.mutate('actual_update_transaction', async () => {
      const updated = await this.api.updateTransaction(transactionId, fields);
      if (Array.isArray(updated) && updated.length === 0) {
        throw new PublicError('NOT_FOUND', 'The requested transaction was not found.', 'actual_update_transaction', false);
      }
      return { success: true as const, transactionId };
    });
  }

  deleteTransaction(transactionId: string) {
    return this.mutate('actual_delete_transaction', async () => {
      const deleted = await this.api.deleteTransaction(transactionId);
      if (Array.isArray(deleted) && deleted.length === 0) {
        throw new PublicError('NOT_FOUND', 'The requested transaction was not found.', 'actual_delete_transaction', false);
      }
      return { success: true as const, transactionId };
    });
  }

  shutdown(): Promise<void> {
    if (this.shutdownPromise) return this.shutdownPromise;
    this.shutdownPromise = this.queue
      .run(async () => {
        if (this.ready || this.initialization) await this.api.shutdown().catch(error => this.logger.error('Actual shutdown failed.', { message: redact(errorMessage(error), this.secrets()) }));
        this.ready = false;
        await this.releaseCacheLock();
      })
      .then(() => this.queue.close());
    return this.shutdownPromise;
  }
}
