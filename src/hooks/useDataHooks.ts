import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  accountRepo,
  incomeSourceRepo,
  categoryRepo,
  transactionRepo,
  loanRepo,
  settingsRepo,
  customCurrencyRepo,
} from '@/database/repositories'
import type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Loan,
  AppSettings,
  CustomCurrency,
} from '@/database/types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountRepo.getAll(),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useAccount(id: number | undefined) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: () => (id ? accountRepo.getById(id) : undefined),
    enabled: !!id,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) =>
      accountRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number | string
      updates: Partial<Omit<Account, 'id' | 'createdAt' | 'userId'>>
    }) => accountRepo.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => accountRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useIncomeSources() {
  return useQuery({
    queryKey: ['incomeSources'],
    queryFn: () => incomeSourceRepo.getAll(),
  })
}

export function useIncomeSource(id: number | undefined) {
  return useQuery({
    queryKey: ['incomeSources', id],
    queryFn: () => (id ? incomeSourceRepo.getById(id) : undefined),
    enabled: !!id,
  })
}

export function useCreateIncomeSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) =>
      incomeSourceRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSources'] })
    },
  })
}

export function useUpdateIncomeSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number | string
      updates: Partial<Omit<IncomeSource, 'id' | 'createdAt' | 'userId'>>
    }) => incomeSourceRepo.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSources'] })
    },
  })
}

export function useDeleteIncomeSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => incomeSourceRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSources'] })
    },
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryRepo.getAll(),
  })
}

export function useCategory(id: number | undefined) {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: () => (id ? categoryRepo.getById(id) : undefined),
    enabled: !!id,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) =>
      categoryRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number | string
      updates: Partial<Omit<Category, 'id' | 'createdAt' | 'userId'>>
    }) => categoryRepo.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => categoryRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const result = await transactionRepo.getAll()
      // DIAGNOSTIC: Log when transactions are fetched
      console.log('[DIAG] useTransactions fetch:', result.length, 'transactions')
      return result
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useTransaction(id: number | undefined) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => (id ? transactionRepo.getById(id) : undefined),
    enabled: !!id,
  })
}

export function useTransactionsByDateRange(startDate: Date, endDate: Date, enabled = true) {
  return useQuery({
    queryKey: ['transactions', 'dateRange', startDate.toISOString(), endDate.toISOString()],
    queryFn: () => transactionRepo.getByDateRange(startDate, endDate),
    enabled,
  })
}

export function useTransactionsByAccount(accountId: number | undefined) {
  return useQuery({
    queryKey: ['transactions', 'account', accountId],
    queryFn: () => (accountId ? transactionRepo.getByAccount(accountId) : []),
    enabled: !!accountId,
  })
}

export function useTransactionsByCategory(categoryId: number | undefined) {
  return useQuery({
    queryKey: ['transactions', 'category', categoryId],
    queryFn: () => (categoryId ? transactionRepo.getByCategory(categoryId) : []),
    enabled: !!categoryId,
  })
}

export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: ['transactions', 'recent', limit],
    queryFn: () => transactionRepo.getRecent(limit),
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) =>
      transactionRepo.create(data),
    onSuccess: async () => {
      queryClient.setQueryData(['transactions'], await transactionRepo.getAll())
      queryClient.setQueryData(['accounts'], await accountRepo.getAll())
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number | string
      updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'userId'>>
    }) => transactionRepo.update(id, updates),
    onSuccess: async () => {
      queryClient.setQueryData(['transactions'], await transactionRepo.getAll())
      queryClient.setQueryData(['accounts'], await accountRepo.getAll())
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => transactionRepo.delete(id),
    onSuccess: async () => {
      queryClient.setQueryData(['transactions'], await transactionRepo.getAll())
      queryClient.setQueryData(['accounts'], await accountRepo.getAll())
    },
  })
}

export function useLoans() {
  return useQuery({
    queryKey: ['loans'],
    queryFn: () => loanRepo.getAll(),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useLoan(id: number | undefined) {
  return useQuery({
    queryKey: ['loans', id],
    queryFn: () => (id ? loanRepo.getById(id) : undefined),
    enabled: !!id,
  })
}

export function useActiveLoans() {
  return useQuery({
    queryKey: ['loans', 'active'],
    queryFn: () => loanRepo.getActive(),
  })
}

export function useCreateLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) =>
      loanRepo.create(data),
    onSuccess: async () => {
      queryClient.setQueryData(['loans'], await loanRepo.getAll())
      queryClient.setQueryData(['accounts'], await accountRepo.getAll())
    },
  })
}

export function useUpdateLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number | string
      updates: Partial<Omit<Loan, 'id' | 'createdAt' | 'userId'>>
    }) => loanRepo.update(id, updates),
    onSuccess: async () => {
      queryClient.setQueryData(['loans'], await loanRepo.getAll())
    },
  })
}

export function useDeleteLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => loanRepo.delete(id),
    onSuccess: async () => {
      queryClient.setQueryData(['loans'], await loanRepo.getAll())
      queryClient.setQueryData(['accounts'], await accountRepo.getAll())
    },
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsRepo.get(),
  })
}

export function useCreateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) =>
      settingsRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (updates: Partial<Omit<AppSettings, 'id' | 'createdAt' | 'userId'>>) =>
      settingsRepo.update(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useCustomCurrencies() {
  return useQuery({
    queryKey: ['customCurrencies'],
    queryFn: () => customCurrencyRepo.getAll(),
  })
}

export function useCustomCurrency(id: number | undefined) {
  return useQuery({
    queryKey: ['customCurrencies', id],
    queryFn: () => (id ? customCurrencyRepo.getById(id) : undefined),
    enabled: !!id,
  })
}

export function useCreateCustomCurrency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<CustomCurrency, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) =>
      customCurrencyRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCurrencies'] })
    },
  })
}

export function useUpdateCustomCurrency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number | string
      updates: Partial<Omit<CustomCurrency, 'id' | 'createdAt' | 'userId'>>
    }) => customCurrencyRepo.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCurrencies'] })
    },
  })
}

export function useDeleteCustomCurrency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => customCurrencyRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCurrencies'] })
    },
  })
}
