import { expect } from '@playwright/test';
import type { IndexedDBHelper } from './indexeddb.helper';

interface LedgerAccount {
  id: number;
  balance: number;
}

interface LedgerLoan {
  id: number;
  type: 'given' | 'received';
  amount: number;
  paidAmount: number;
  status: 'active' | 'partially_paid' | 'fully_paid';
}

interface LedgerTransaction {
  type: string;
  amount: number;
  accountId?: number;
  toAccountId?: number;
  toAmount?: number;
  loanId?: number;
  loanCurrencyAmount?: number;
}

const round = (value: number) => Math.round(value * 1e8) / 1e8;

/**
 * Asserts the whole loan ledger is internally consistent, so every scenario
 * can check one invariant instead of re-deriving balances by hand:
 *
 *  - each account balance == its opening balance + the effect of every
 *    transaction stored against it
 *  - each loan's paidAmount == the sum of its payments (in loan currency)
 *  - each loan's status matches paidAmount
 *  - no transaction points at a loan that no longer exists
 */
export async function expectLedgerConsistent(
  dbHelper: IndexedDBHelper,
  openingBalances: Record<number, number>
): Promise<void> {
  const [accounts, loans, transactions] = await Promise.all([
    dbHelper.getAllRecords<LedgerAccount>('accounts'),
    dbHelper.getAllRecords<LedgerLoan>('loans'),
    dbHelper.getAllRecords<LedgerTransaction>('transactions'),
  ]);
  const loanById = new Map(loans.map((loan) => [loan.id, loan]));

  const expected = new Map<number, number>(
    Object.entries(openingBalances).map(([id, balance]) => [Number(id), balance])
  );
  const adjust = (accountId: number | undefined, delta: number) => {
    if (accountId !== undefined && expected.has(accountId)) {
      expected.set(accountId, (expected.get(accountId) ?? 0) + delta);
    }
  };

  const paidByLoan = new Map<number, number>();
  for (const tx of transactions) {
    if (tx.loanId !== undefined) {
      expect(loanById.has(tx.loanId), `transaction references missing loan ${tx.loanId}`).toBe(
        true
      );
    }
    switch (tx.type) {
      case 'income':
        adjust(tx.accountId, tx.amount);
        break;
      case 'expense':
      case 'loan_given':
        adjust(tx.accountId, -tx.amount);
        break;
      case 'loan_received':
        adjust(tx.accountId, tx.amount);
        break;
      case 'transfer':
        adjust(tx.accountId, -tx.amount);
        adjust(tx.toAccountId, tx.toAmount ?? tx.amount);
        break;
      case 'loan_payment': {
        const loan = tx.loanId === undefined ? undefined : loanById.get(tx.loanId);
        adjust(tx.accountId, loan?.type === 'given' ? tx.amount : -tx.amount);
        if (tx.loanId !== undefined) {
          paidByLoan.set(
            tx.loanId,
            (paidByLoan.get(tx.loanId) ?? 0) + (tx.loanCurrencyAmount ?? tx.amount)
          );
        }
        break;
      }
    }
  }

  for (const account of accounts) {
    if (!expected.has(account.id)) continue;
    expect(round(account.balance), `balance of account ${account.id}`).toBe(
      round(expected.get(account.id) ?? 0)
    );
  }

  for (const loan of loans) {
    const paid = round(paidByLoan.get(loan.id) ?? 0);
    expect(round(loan.paidAmount), `paidAmount of loan ${loan.id}`).toBe(paid);
    let status: LedgerLoan['status'] = 'active';
    if (paid >= loan.amount) status = 'fully_paid';
    else if (paid > 0) status = 'partially_paid';
    expect(loan.status, `status of loan ${loan.id}`).toBe(status);
  }
}
