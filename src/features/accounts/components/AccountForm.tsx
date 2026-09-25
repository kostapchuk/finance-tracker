import { useState } from 'react'

import { ColorAndVisibilityFields } from '@/components/ui/ColorAndVisibilityFields'
import { CurrencySelect } from '@/components/ui/CurrencySelect'
import { FormDialogFooter } from '@/components/ui/FormDialogFooter'
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
import { accountRepo } from '@/database/repositories'
import type { Account, AccountType } from '@/database/types'
import { useEntityFormFields } from '@/hooks/useEntityFormFields'
import { useLanguage } from '@/hooks/useLanguage'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { useAppStore } from '@/store/useAppStore'

interface AccountFormProps {
  account?: Account
  open: boolean
  onClose: () => void
}

export function AccountForm({ account, open, onClose }: AccountFormProps) {
  const refreshAccounts = useAppStore((state) => state.refreshAccounts)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t } = useLanguage()

  const accountTypes: { value: AccountType; label: string }[] = [
    { value: 'cash', label: t('cash') },
    { value: 'bank', label: t('bankAccount') },
    { value: 'crypto', label: t('cryptoWallet') },
    { value: 'credit_card', label: t('creditCard') },
  ]

  const {
    name,
    setName,
    color,
    setColor,
    hiddenFromDashboard,
    setHiddenFromDashboard,
    isLoading,
    setIsLoading,
    resetFields,
  } = useEntityFormFields()
  const [type, setType] = useState<AccountType>('bank')
  const [currency, setCurrency] = useState(mainCurrency)
  const [balance, setBalance] = useState('0')

  useResetOnChange([account, open, mainCurrency], () => {
    resetFields(account)
    if (account) {
      setType(account.type)
      setCurrency(account.currency)
      setBalance(account.balance.toString())
    } else {
      setType('bank')
      setCurrency(mainCurrency)
      setBalance('0')
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      await (account?.id
        ? accountRepo.update(account.id, {
            name: name.trim(),
            type,
            currency,
            balance: Number.parseFloat(balance) || 0,
            color,
            hiddenFromDashboard,
          })
        : accountRepo.create({
            name: name.trim(),
            type,
            currency,
            balance: Number.parseFloat(balance) || 0,
            color,
            hiddenFromDashboard,
          }))
      await refreshAccounts()
      onClose()
    } catch (error) {
      console.error('Failed to save account:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? t('editAccount') : t('addAccount')}</DialogTitle>
        </DialogHeader>
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
            <CurrencySelect
              id="currency"
              value={currency}
              onValueChange={setCurrency}
              placeholder={t('selectCurrency')}
              showName
            />
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

          <ColorAndVisibilityFields
            color={color}
            onColorChange={setColor}
            hiddenFromDashboard={hiddenFromDashboard}
            onHiddenFromDashboardChange={setHiddenFromDashboard}
          />

          <FormDialogFooter isEditing={!!account} isLoading={isLoading} onCancel={onClose} />
        </form>
      </DialogContent>
    </Dialog>
  )
}
