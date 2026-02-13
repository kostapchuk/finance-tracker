import {
  Plus,
  Pencil,
  Trash2,
  Handshake,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
} from 'lucide-react'
import { useState, useMemo } from 'react'

import { LoanForm } from './LoanForm'
import { PaymentDialog } from './PaymentDialog'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { loanRepo } from '@/database/repositories'
import type { Loan } from '@/database/types'
import { useLanguage } from '@/hooks/useLanguage'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'

const statusConfig = {
  active: { label: 'Active', variant: 'default' as const },
  partially_paid: { label: 'Partially Paid', variant: 'warning' as const },
  fully_paid: { label: 'Paid', variant: 'success' as const },
}

export function LoanList() {
  const { t } = useLanguage()
  const loans = useAppStore((state) => state.loans)
  const accounts = useAppStore((state) => state.accounts)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const refreshLoans = useAppStore((state) => state.refreshLoans)
  const [formOpen, setFormOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan)
    setFormOpen(true)
  }

  const handleDelete = async (loan: Loan) => {
    if (!loan.id) return
    if (!confirm(`Delete loan for "${loan.personName}"? This cannot be undone.`)) return

    await loanRepo.delete(loan.id)
    await refreshLoans()
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingLoan(null)
  }

  const getAccountName = (id?: number) => {
    const account = accounts.find((a) => a.id === id)
    return account ? `${account.name} (${account.currency})` : ''
  }

  const filteredLoans = useMemo(() => {
    switch (activeTab) {
      case 'given':
        return loans.filter((l) => l.type === 'given')
      case 'received':
        return loans.filter((l) => l.type === 'received')
      case 'active':
        return loans.filter((l) => l.status !== 'fully_paid')
      default:
        return loans
    }
  }, [loans, activeTab])

  const stats = useMemo(() => {
    const givenLoans = loans.filter((l) => l.type === 'given' && l.status !== 'fully_paid')
    const receivedLoans = loans.filter((l) => l.type === 'received' && l.status !== 'fully_paid')

    const totalOwedToYou = givenLoans.reduce((sum, l) => sum + (l.amount - l.paidAmount), 0)
    const totalYouOwe = receivedLoans.reduce((sum, l) => sum + (l.amount - l.paidAmount), 0)

    return { totalOwedToYou, totalYouOwe }
  }, [loans])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Loans</h3>
          <p className="text-sm text-muted-foreground">Track money you've lent or borrowed</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Loan
        </Button>
      </div>

      {/* Summary Cards */}
      {loans.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="h-5 w-5 text-green-600" />
                <p className="text-sm text-muted-foreground">Owed to You</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalOwedToYou, mainCurrency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft className="h-5 w-5 text-red-600" />
                <p className="text-sm text-muted-foreground">You Owe</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalYouOwe, mainCurrency)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="given">Lent</TabsTrigger>
          <TabsTrigger value="received">Borrowed</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredLoans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No loans found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === 'all'
                    ? 'Add a loan to start tracking money lent or borrowed'
                    : `No ${activeTab === 'given' ? 'lent' : activeTab === 'received' ? 'borrowed' : 'active'} loans`}
                </p>
                {activeTab === 'all' && (
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Loan
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLoans.map((loan) => {
                const remaining = loan.amount - loan.paidAmount
                const progress = (loan.paidAmount / loan.amount) * 100

                return (
                  <Card key={loan.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {loan.type === 'given' ? (
                            <ArrowUpRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ArrowDownLeft className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <CardTitle className="text-base">{loan.personName}</CardTitle>
                            <Badge variant="outline" className="mt-1">
                              {loan.type === 'given' ? 'Lent' : 'Borrowed'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(loan)}
                            aria-label={t('edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(loan)}
                            aria-label={t('delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-medium">
                          {formatCurrency(loan.amount, loan.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid</span>
                        <span>{formatCurrency(loan.paidAmount, loan.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Remaining</span>
                        <span className={loan.type === 'given' ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(remaining, loan.currency)}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <Badge variant={statusConfig[loan.status].variant}>
                          {statusConfig[loan.status].label}
                        </Badge>
                        {loan.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            Due: {formatDate(new Date(loan.dueDate))}
                          </span>
                        )}
                      </div>

                      {loan.description && (
                        <p className="text-sm text-muted-foreground">{loan.description}</p>
                      )}

                      {getAccountName(loan.accountId) && (
                        <p className="text-xs text-muted-foreground">
                          Account: {getAccountName(loan.accountId)}
                        </p>
                      )}

                      {loan.status !== 'fully_paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => setPaymentLoan(loan)}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Record Payment
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <LoanForm loan={editingLoan} open={formOpen} onClose={handleCloseForm} />
      <PaymentDialog loan={paymentLoan} open={!!paymentLoan} onClose={() => setPaymentLoan(null)} />
    </div>
  )
}
