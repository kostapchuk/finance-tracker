import { BlurredAmount } from '@/components/ui/BlurredAmount'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Loan } from '@/database/types'
import { useLanguage } from '@/hooks/useLanguage'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'

interface LoanDetailDialogProps {
  loan: Loan | null
  open: boolean
  onClose: () => void
}

export function LoanDetailDialog({ loan, open, onClose }: LoanDetailDialogProps) {
  const transactions = useAppStore((state) => state.transactions)
  const accounts = useAppStore((state) => state.accounts)
  const navigateToHistoryWithTransaction = useAppStore(
    (state) => state.navigateToHistoryWithTransaction
  )
  const { t } = useLanguage()

  if (!loan) return null

  const loanTransactions = transactions
    .filter((tx) => tx.loanId === loan.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const getAccountName = (id?: number) => {
    const account = accounts.find((a) => a.id === id)
    return account ? `${account.name} (${account.currency})` : 'Unknown'
  }

  const handleTransactionClick = (transactionId?: number) => {
    if (!transactionId) return
    onClose()
    navigateToHistoryWithTransaction(transactionId)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{loan.personName}</DialogTitle>
          <DialogDescription>
            {loan.type === 'given' ? t('repaid') : t('paidOff')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <BlurredAmount className="text-2xl font-bold">
              {formatCurrency(loan.amount, loan.currency)}
            </BlurredAmount>
            <span className="text-sm text-muted-foreground">{t('total')}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${loan.type === 'given' ? 'bg-success' : 'bg-destructive'}`}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('paymentHistory')}
          </h3>
          {loanTransactions.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground text-sm">
              {t('noTransactionsFound')}
            </p>
          ) : (
            <div className="space-y-2">
              {loanTransactions.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => handleTransactionClick(tx.id)}
                  className="flex items-center justify-between w-full p-3 bg-secondary/50 rounded-xl active:bg-secondary/70 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {tx.type === 'loan_payment'
                        ? t('paid')
                        : loan.type === 'given'
                          ? t('moneyGiven')
                          : t('moneyReceived')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDate(new Date(tx.date))} • {getAccountName(tx.accountId)}
                    </p>
                  </div>
                  <BlurredAmount className="font-mono font-semibold flex-shrink-0 ml-3">
                    {formatCurrency(tx.amount, tx.currency)}
                  </BlurredAmount>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
