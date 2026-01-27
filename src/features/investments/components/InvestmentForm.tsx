import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { investmentRepo } from '@/database/repositories'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import type { Investment } from '@/database/types'
import { getAllCurrencies } from '@/utils/currency'

interface InvestmentFormProps {
  investment?: Investment | null
  open: boolean
  onClose: () => void
}

export function InvestmentForm({ investment, open, onClose }: InvestmentFormProps) {
  const accounts = useAppStore((state) => state.accounts)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const refreshInvestments = useAppStore((state) => state.refreshInvestments)
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)

  const investmentAccounts = accounts.filter((a) => a.type === 'investment')

  const [accountId, setAccountId] = useState('')
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [averageCost, setAverageCost] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  const [currency, setCurrency] = useState(mainCurrency)

  useEffect(() => {
    if (investment) {
      setAccountId(investment.accountId.toString())
      setSymbol(investment.symbol)
      setName(investment.name)
      setQuantity(investment.quantity.toString())
      setAverageCost(investment.averageCost.toString())
      setCurrentPrice(investment.currentPrice.toString())
      setCurrency(investment.currency)
    } else {
      setAccountId(investmentAccounts[0]?.id?.toString() || '')
      setSymbol('')
      setName('')
      setQuantity('')
      setAverageCost('')
      setCurrentPrice('')
      setCurrency(mainCurrency)
    }
  }, [investment, open, investmentAccounts, mainCurrency])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!symbol.trim() || !name.trim() || !accountId) return

    setIsLoading(true)
    try {
      if (investment?.id) {
        await investmentRepo.update(investment.id, {
          accountId: parseInt(accountId),
          symbol: symbol.trim().toUpperCase(),
          name: name.trim(),
          quantity: parseFloat(quantity) || 0,
          averageCost: parseFloat(averageCost) || 0,
          currentPrice: parseFloat(currentPrice) || 0,
          currency,
        })
      } else {
        await investmentRepo.create({
          accountId: parseInt(accountId),
          symbol: symbol.trim().toUpperCase(),
          name: name.trim(),
          quantity: parseFloat(quantity) || 0,
          averageCost: parseFloat(averageCost) || 0,
          currentPrice: parseFloat(currentPrice) || 0,
          currency,
        })
      }
      await refreshInvestments()
      onClose()
    } catch (error) {
      console.error('Failed to save investment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{investment ? t('editInvestment') : t('addInvestment')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account">{t('investmentAccount')}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectAccount')} />
              </SelectTrigger>
              <SelectContent>
                {investmentAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id!.toString()}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {investmentAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('noInvestmentAccounts')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">{t('symbol')}</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder={t('egAAPL')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('egAppleInc')}
                required
              />
            </div>
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
                    {c.symbol} {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">{t('quantity')}</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="averageCost">{t('averageCost')}</Label>
              <Input
                id="averageCost"
                type="number"
                step="0.01"
                value={averageCost}
                onChange={(e) => setAverageCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPrice">{t('currentPrice')}</Label>
              <Input
                id="currentPrice"
                type="number"
                step="0.01"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || investmentAccounts.length === 0}>
              {isLoading ? t('saving') : investment ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
