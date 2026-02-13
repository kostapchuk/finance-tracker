import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  Building2,
  Bitcoin,
  TrendingUp,
  CreditCard,
} from 'lucide-react'
import { useState } from 'react'

import { AccountForm } from './AccountForm'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { accountRepo } from '@/database/repositories'
import type { Account, AccountType } from '@/database/types'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/utils/currency'

const typeIcons: Record<AccountType, React.ReactNode> = {
  cash: <Wallet className="h-4 w-4" />,
  bank: <Building2 className="h-4 w-4" />,
  crypto: <Bitcoin className="h-4 w-4" />,
  investment: <TrendingUp className="h-4 w-4" />,
  credit_card: <CreditCard className="h-4 w-4" />,
}

const typeLabels: Record<AccountType, string> = {
  cash: 'Cash',
  bank: 'Bank',
  crypto: 'Crypto',
  investment: 'Investment',
  credit_card: 'Credit Card',
}

export function AccountList() {
  const accounts = useAppStore((state) => state.accounts)
  const refreshAccounts = useAppStore((state) => state.refreshAccounts)
  const [formOpen, setFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setFormOpen(true)
  }

  const handleDelete = async (account: Account) => {
    if (!account.id) return
    if (!confirm(`Delete "${account.name}"? This cannot be undone.`)) return

    await accountRepo.delete(account.id)
    await refreshAccounts()
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingAccount(null)
  }

  const totalByType = accounts.reduce(
    (acc, account) => {
      if (!acc[account.currency]) {
        acc[account.currency] = 0
      }
      acc[account.currency] += account.balance
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Your Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Manage your cash, bank, crypto, and investment accounts
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {Object.entries(totalByType).length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {Object.entries(totalByType).map(([currency, total]) => (
            <Card key={currency} className="flex-1 min-w-[150px]">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total ({currency})</p>
                <p className="text-2xl font-bold">{formatCurrency(total, currency)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No accounts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first account to start tracking your finances
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="relative overflow-hidden">
              <div
                className="absolute top-0 left-0 w-1 h-full"
                style={{ backgroundColor: account.color }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${account.color}20` }}
                    >
                      {typeIcons[account.type]}
                    </div>
                    <div>
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {typeLabels[account.type]}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(account)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(account)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(account.balance, account.currency)}
                </p>
                <p className="text-sm text-muted-foreground">{account.currency}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AccountForm account={editingAccount} open={formOpen} onClose={handleCloseForm} />
    </div>
  )
}
