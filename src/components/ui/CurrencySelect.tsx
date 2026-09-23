import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAllCurrencies } from '@/utils/currency'

interface CurrencySelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  /** Include the currency name alongside the code (AccountForm/IncomeSourceForm style). */
  showName?: boolean
  id?: string
  triggerClassName?: string
}

/**
 * The currency Select dropdown repeated across AccountForm, IncomeSourceForm,
 * SettingsPage, and LoanForm.
 */
export function CurrencySelect({
  value,
  onValueChange,
  placeholder,
  showName,
  id,
  triggerClassName,
}: CurrencySelectProps) {
  const currencies = getAllCurrencies()
  const symbol = currencies.find((c) => c.code === value)?.symbol

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={triggerClassName}>
        <SelectValue placeholder={placeholder}>
          {value ? `${symbol ?? ''} ${value}` : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {currencies.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.symbol} {c.code}
            {showName ? ` - ${c.name}` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
