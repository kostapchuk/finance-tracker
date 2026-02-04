import type { AccountType, CategoryType, LoanType } from '../../src/database/types';

export interface TestAccount {
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface TestCategory {
  name: string;
  color: string;
  icon: string;
  categoryType: CategoryType;
  budget?: number;
  budgetPeriod?: 'weekly' | 'monthly' | 'yearly';
  sortOrder: number;
}

export interface TestIncomeSource {
  name: string;
  currency: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface TestLoan {
  type: LoanType;
  personName: string;
  description: string;
  amount: number;
  currency: string;
  paidAmount: number;
  status: 'active' | 'partially_paid' | 'fully_paid';
  accountId: number;
  dueDate?: Date;
}

export const testAccounts = {
  usdCash: (): TestAccount => ({
    name: 'USD Cash',
    type: 'cash',
    currency: 'USD',
    balance: 1000,
    color: '#22c55e',
    icon: 'wallet',
    sortOrder: 0,
  }),
  eurBank: (): TestAccount => ({
    name: 'EUR Bank',
    type: 'bank',
    currency: 'EUR',
    balance: 2000,
    color: '#3b82f6',
    icon: 'landmark',
    sortOrder: 1,
  }),
  btcCrypto: (): TestAccount => ({
    name: 'BTC Wallet',
    type: 'crypto',
    currency: 'BTC',
    balance: 0.5,
    color: '#f59e0b',
    icon: 'bitcoin',
    sortOrder: 2,
  }),
  creditCard: (): TestAccount => ({
    name: 'Credit Card',
    type: 'credit_card',
    currency: 'USD',
    balance: -500,
    color: '#ef4444',
    icon: 'credit-card',
    sortOrder: 3,
  }),
};

export const testCategories = {
  food: (): TestCategory => ({
    name: 'Food',
    color: '#f97316',
    icon: 'utensils',
    categoryType: 'expense',
    sortOrder: 0,
  }),
  transport: (): TestCategory => ({
    name: 'Transport',
    color: '#06b6d4',
    icon: 'car',
    categoryType: 'expense',
    budget: 500,
    budgetPeriod: 'monthly',
    sortOrder: 1,
  }),
  entertainment: (): TestCategory => ({
    name: 'Entertainment',
    color: '#8b5cf6',
    icon: 'gamepad-2',
    categoryType: 'expense',
    budget: 200,
    budgetPeriod: 'weekly',
    sortOrder: 2,
  }),
};

export const testIncomeSources = {
  salary: (): TestIncomeSource => ({
    name: 'Salary',
    currency: 'USD',
    color: '#22c55e',
    icon: 'briefcase',
    sortOrder: 0,
  }),
  freelance: (): TestIncomeSource => ({
    name: 'Freelance',
    currency: 'EUR',
    color: '#3b82f6',
    icon: 'laptop',
    sortOrder: 1,
  }),
};

export const testLoans = {
  givenToJohn: (accountId: number): TestLoan => ({
    type: 'given',
    personName: 'John Doe',
    description: 'Borrowed for vacation',
    amount: 500,
    currency: 'USD',
    paidAmount: 0,
    status: 'active',
    accountId,
  }),
  receivedFromJane: (accountId: number): TestLoan => ({
    type: 'received',
    personName: 'Jane Smith',
    description: 'Personal loan',
    amount: 1000,
    currency: 'USD',
    paidAmount: 0,
    status: 'active',
    accountId,
  }),
  eurLoan: (accountId: number): TestLoan => ({
    type: 'given',
    personName: 'Pierre',
    description: 'EUR loan from USD account',
    amount: 200,
    currency: 'EUR',
    paidAmount: 0,
    status: 'active',
    accountId,
  }),
};
