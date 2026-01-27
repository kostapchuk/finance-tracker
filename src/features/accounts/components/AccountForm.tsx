import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ColorPicker } from '@/components/ui/color-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { accountRepo } from '@/database/repositories'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import type { Account, AccountType } from '@/database/types'
import { getAllCurrencies } from '@/utils/currency'
import { getRandomColor } from '@/utils/colors'

interface AccountFormProps {
  account?: Account | null
  open: boolean
  onClose: () => void
}

export function AccountForm({ account, open, onClose }: AccountFormProps) {
  const refreshAccounts = useAppStore((state) => state.refreshAccounts)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)

  const accountTypes: { value: AccountType; label: string }[] = [
    { value: 'cash', label: t('cash') },
    { value: 'bank', label: t('bankAccount') },
    { value: 'crypto', label: t('cryptoWallet') },
    { value: 'investment', label: t('investmentAccount') },
    { value: 'credit_card', label: t('creditCard') },
  ]

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('bank')
  const [currency, setCurrency] = useState(mainCurrency)
  const [balance, setBalance] = useState('0')
  const [color, setColor] = useState(getRandomColor())

  useEffect(() => {
    if (account) {
      setName(account.name)
      setType(account.type)
      setCurrency(account.currency)
      setBalance(account.balance.toString())
      setColor(account.color)
    } else {
      setName('')
      setType('bank')
      setCurrency(mainCurrency)
      setBalance('0')
      setColor(getRandomColor())
    }
  }, [account, open, mainCurrency])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      if (account?.id) {
        await accountRepo.update(account.id, {
          name: name.trim(),
          type,
          currency,
          balance: parseFloat(balance) || 0,
          color,
        })
      } else {
        await accountRepo.create({
          name: name.trim(),
          type,
          currency,
          balance: parseFloat(balance) || 0,
          color,
        })
      }
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
                <SelectValue placeholder={t('selectType')} />
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
                <SelectValue placeholder={t('selectCurrency')} />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('saving') : account ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
