import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Account } from '@/database/types'

interface AccountSelectProps {
  accounts: Account[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  id?: string
}

/**
 * The account Select dropdown (name + currency) repeated in LoanForm and
 * PaymentDialog.
 */
export function AccountSelect({
  accounts,
  value,
  onValueChange,
  placeholder,
  id,
}: AccountSelectProps) {
  const selected = accounts.find((a) => a.id?.toString() === value)

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder}>
          {selected ? `${selected.name} (${selected.currency})` : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id!.toString()}>
            {a.name} ({a.currency})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
