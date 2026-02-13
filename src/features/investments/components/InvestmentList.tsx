import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { useState, useMemo } from 'react'

import { InvestmentForm } from './InvestmentForm'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { investmentRepo } from '@/database/repositories'
import type { Investment } from '@/database/types'
import { useLanguage } from '@/hooks/useLanguage'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/utils/currency'

export function InvestmentList() {
  const investments = useAppStore((state) => state.investments)
  const accounts = useAppStore((state) => state.accounts)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const refreshInvestments = useAppStore((state) => state.refreshInvestments)
  const { t } = useLanguage()
  const [formOpen, setFormOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [priceUpdates, setPriceUpdates] = useState<Record<number, string>>({})

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment)
    setFormOpen(true)
  }

  const handleDelete = async (investment: Investment) => {
    if (!investment.id) return
    if (!confirm(`Delete "${investment.symbol}"? This cannot be undone.`)) return

    await investmentRepo.delete(investment.id)
    await refreshInvestments()
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingInvestment(null)
  }

  const handleUpdatePrice = async (investment: Investment) => {
    const newPrice = parseFloat(priceUpdates[investment.id!] || '')
    if (isNaN(newPrice) || newPrice < 0) return

    await investmentRepo.updatePrice(investment.id!, newPrice)
    await refreshInvestments()
    setPriceUpdates((prev) => ({ ...prev, [investment.id!]: '' }))
  }

  const getAccountName = (id: number) => {
    const account = accounts.find((a) => a.id === id)
    return account ? `${account.name} (${account.currency})` : 'Unknown'
  }

  const portfolioStats = useMemo(() => {
    let totalValue = 0
    let totalCost = 0

    investments.forEach((inv) => {
      totalValue += inv.quantity * inv.currentPrice
      totalCost += inv.quantity * inv.averageCost
    })

    const totalGain = totalValue - totalCost
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

    return { totalValue, totalCost, totalGain, totalGainPercent }
  }, [investments])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">{t('investmentPortfolio')}</h3>
          <p className="text-sm text-muted-foreground">{t('trackInvestments')}</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('addInvestment')}
        </Button>
      </div>

      {/* Portfolio Summary */}
      {investments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{t('totalValue')}</p>
              <p className="text-2xl font-bold">
                {formatCurrency(portfolioStats.totalValue, mainCurrency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{t('totalCost')}</p>
              <p className="text-2xl font-bold">
                {formatCurrency(portfolioStats.totalCost, mainCurrency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{t('totalGainLoss')}</p>
              <p
                className={`text-2xl font-bold ${
                  portfolioStats.totalGain >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {portfolioStats.totalGain >= 0 ? '+' : ''}
                {formatCurrency(portfolioStats.totalGain, mainCurrency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{t('totalReturn')}</p>
              <p
                className={`text-2xl font-bold ${
                  portfolioStats.totalGainPercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {portfolioStats.totalGainPercent >= 0 ? '+' : ''}
                {portfolioStats.totalGainPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {investments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">{t('noInvestments')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('addInvestmentsToTrack')}</p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addInvestment')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {investments.map((investment) => {
            const value = investment.quantity * investment.currentPrice
            const cost = investment.quantity * investment.averageCost
            const gain = value - cost
            const gainPercent = cost > 0 ? (gain / cost) * 100 : 0
            const isPositive = gain >= 0

            return (
              <Card key={investment.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {investment.symbol}
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{investment.name}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(investment)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(investment)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('account')}</span>
                    <span>{getAccountName(investment.accountId)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('quantity')}</span>
                    <span>{investment.quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('averageCost')}</span>
                    <span>{formatCurrency(investment.averageCost, investment.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('currentPrice')}</span>
                    <span>{formatCurrency(investment.currentPrice, investment.currency)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>{t('value')}</span>
                    <span>{formatCurrency(value, investment.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('gainLoss')}</span>
                    <Badge variant={isPositive ? 'success' : 'destructive'}>
                      {isPositive ? '+' : ''}
                      {formatCurrency(gain, investment.currency)} ({gainPercent.toFixed(2)}%)
                    </Badge>
                  </div>

                  <div className="pt-2 border-t flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={t('newPrice')}
                      value={priceUpdates[investment.id!] || ''}
                      onChange={(e) =>
                        setPriceUpdates((prev) => ({
                          ...prev,
                          [investment.id!]: e.target.value,
                        }))
                      }
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdatePrice(investment)}
                      disabled={!priceUpdates[investment.id!]}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <InvestmentForm investment={editingInvestment} open={formOpen} onClose={handleCloseForm} />
    </div>
  )
}
