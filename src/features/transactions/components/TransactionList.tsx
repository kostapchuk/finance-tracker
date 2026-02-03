import { useState, useMemo } from 'react'
import { ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import type { Transaction, TransactionType } from '@/database/types'

export function TransactionList() {
  const { t } = useLanguage()

  const typeConfig: Record<TransactionType, { label: string; icon: React.ReactNode; color: string }> = {
    income: { label: t('income'), icon: <ArrowUpCircle className="h-4 w-4" />, color: 'text-green-600' },
    expense: { label: t('expense'), icon: <ArrowDownCircle className="h-4 w-4" />, color: 'text-red-600' },
    transfer: { label: t('transfer'), icon: <ArrowLeftRight className="h-4 w-4" />, color: 'text-blue-600' },
    investment_buy: { label: t('buy'), icon: <ArrowDownCircle className="h-4 w-4" />, color: 'text-purple-600' },
    investment_sell: { label: t('sell'), icon: <ArrowUpCircle className="h-4 w-4" />, color: 'text-purple-600' },
    loan_given: { label: t('loanGiven'), icon: <ArrowDownCircle className="h-4 w-4" />, color: 'text-orange-600' },
    loan_received: { label: t('loanReceived'), icon: <ArrowUpCircle className="h-4 w-4" />, color: 'text-orange-600' },
    loan_payment: { label: t('payment'), icon: <ArrowLeftRight className="h-4 w-4" />, color: 'text-orange-600' },
  }
  const transactions = useAppStore((state) => state.transactions)
  const accounts = useAppStore((state) => state.accounts)
  const categories = useAppStore((state) => state.categories)
  const incomeSources = useAppStore((state) => state.incomeSources)
  const mainCurrency = useAppStore((state) => state.mainCurrency)

  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const getAccountName = (id?: number) => {
    const account = accounts.find((a) => a.id === id)
    return account ? `${account.name} (${account.currency})` : 'Unknown'
  }
  const getCategoryName = (id?: number) => categories.find((c) => c.id === id)?.name || 'Unknown'
  const getIncomeSourceName = (id?: number) => incomeSources.find((s) => s.id === id)?.name || 'Unknown'

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (accountFilter !== 'all' && t.accountId?.toString() !== accountFilter && t.toAccountId?.toString() !== accountFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const comment = t.comment?.toLowerCase() || ''
        const accountName = getAccountName(t.accountId).toLowerCase()
        const categoryName = getCategoryName(t.categoryId).toLowerCase()
        const sourceName = getIncomeSourceName(t.incomeSourceId).toLowerCase()
        if (!comment.includes(query) && !accountName.includes(query) && !categoryName.includes(query) && !sourceName.includes(query)) {
          return false
        }
      }
      return true
    })
  }, [transactions, typeFilter, accountFilter, searchQuery, accounts, categories, incomeSources])

  const getTransactionDescription = (t: Transaction): string => {
    switch (t.type) {
      case 'income':
        return `${getIncomeSourceName(t.incomeSourceId)} → ${getAccountName(t.accountId)}`
      case 'expense':
        return `${getAccountName(t.accountId)} → ${getCategoryName(t.categoryId)}`
      case 'transfer':
        return `${getAccountName(t.accountId)} → ${getAccountName(t.toAccountId)}`
      default:
        return getAccountName(t.accountId)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('transactionHistory')}</span>
          <Badge variant="secondary">{filteredTransactions.length} {t('transactions')}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder={t('type')}>
                {typeFilter === 'all' ? t('allTypes') :
                 typeFilter === 'income' ? t('income') :
                 typeFilter === 'expense' ? t('expense') :
                 t('transfer')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTypes')}</SelectItem>
              <SelectItem value="income">{t('income')}</SelectItem>
              <SelectItem value="expense">{t('expense')}</SelectItem>
              <SelectItem value="transfer">{t('transfer')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('account')}>
                {accountFilter !== 'all' && getAccountName(parseInt(accountFilter))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allAccounts')}</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id!.toString()}>
                  {a.name} ({a.currency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[200px]"
          />
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('noTransactionsFound')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((transaction) => {
              const config = typeConfig[transaction.type]
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={config.color}>{config.icon}</div>
                    <div>
                      <p className="text-sm font-medium">
                        {getTransactionDescription(transaction)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        <span>{formatDate(new Date(transaction.date))}</span>
                        {transaction.comment && (
                          <span className="truncate max-w-[200px]">
                            - {transaction.comment}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span
                      className={`font-mono font-medium ${
                        transaction.type === 'income' ? 'text-foreground' :
                        transaction.type === 'expense' ? 'text-red-600' : ''
                      }`}
                    >
                      {transaction.type === 'expense' ? '- ' : ''}
                      {transaction.mainCurrencyAmount != null
                        ? formatCurrency(transaction.mainCurrencyAmount, mainCurrency)
                        : formatCurrency(transaction.amount, transaction.currency)}
                    </span>
                    {transaction.mainCurrencyAmount != null && transaction.currency !== mainCurrency && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {transaction.type === 'expense' ? '- ' : ''}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    )}
                    {transaction.type === 'transfer' && transaction.toAmount != null && (
                      <span className="text-xs text-muted-foreground font-mono">
                        → {formatCurrency(transaction.toAmount, accounts.find(a => a.id === transaction.toAccountId)?.currency || transaction.currency)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
