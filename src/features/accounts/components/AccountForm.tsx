import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/ui/color-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'
import { accountRepo } from '@/database/repositories'
import type { Account, AccountType } from '@/database/types'
import { useLanguage } from '@/hooks/useLanguage'
import { queryClient } from '@/lib/queryClient'
import { useAppStore } from '@/store/useAppStore'
import { getRandomColor } from '@/utils/colors'
import { getAllCurrencies } from '@/utils/currency'

interface AccountFormProps {
  account?: Account | null
  open: boolean
  onClose: () => void
}

function AccountFormContent({
  account,
  onClose,
}: {
  account?: Account | null
  onClose: () => void
}) {
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t } = useLanguage()

  const accountTypes: { value: AccountType; label: string }[] = [
    { value: 'cash', label: t('cash') },
    { value: 'bank', label: t('bankAccount') },
    { value: 'crypto', label: t('cryptoWallet') },
    { value: 'credit_card', label: t('creditCard') },
  ]

  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank')
  const [currency, setCurrency] = useState(account?.currency ?? mainCurrency)
  const [balance, setBalance] = useState(account?.balance?.toString() ?? '0')
  const [color, setColor] = useState(account?.color ?? getRandomColor())
  const [hiddenFromDashboard, setHiddenFromDashboard] = useState(
    account?.hiddenFromDashboard ?? false
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      if (account?.id) {
        await accountRepo.update(account.id, {
          name: name.trim(),
          type,
          currency,
          balance: parseFloat(balance) || 0,
          color,
          hiddenFromDashboard,
        })
      } else {
        await accountRepo.create({
          name: name.trim(),
          type,
          currency,
          balance: parseFloat(balance) || 0,
          color,
          hiddenFromDashboard,
        })
      }
      // Update query cache directly
      const updatedAccounts = await accountRepo.getAll()
      queryClient.setQueryData(['accounts'], updatedAccounts)
      onClose()
    } catch (error) {
      console.error('Failed to save account:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('name')}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('egMainChecking')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">{t('type')}</Label>
        <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectType')}>
              {accountTypes.find((at) => at.value === type)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {accountTypes.map((at) => (
              <SelectItem key={at.value} value={at.value}>
                {at.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">{t('currency')}</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectCurrency')}>
              {getAllCurrencies().find((c) => c.code === currency)?.symbol} {currency}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {getAllCurrencies().map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.symbol} {c.code} - {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="balance">{t('initialBalance')}</Label>
        <Input
          id="balance"
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <Label>{t('color')}</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="flex items-center justify-between">
        <Label>{t('hideFromDashboard')}</Label>
        <Toggle checked={hiddenFromDashboard} onCheckedChange={setHiddenFromDashboard} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="submit">{account ? t('update') : t('create')}</Button>
      </div>
    </form>
  )
}

export function AccountForm({ account, open, onClose }: AccountFormProps) {
  const { t } = useLanguage()
  // Use key to force re-mount when account changes, ensuring initial state is reset
  const formKey = account?.id ?? 'new'

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? t('editAccount') : t('addAccount')}</DialogTitle>
        </DialogHeader>
        <AccountFormContent key={formKey} account={account} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}
