import * as React from 'react'

import { cn } from '@/utils/cn'

export interface DateInputProps {
  value: string
  onChange: (value: string) => void
  language: string
  placeholder?: string
  className?: string
}

const localeByLanguage: Record<string, string> = {
  en: 'en-US',
  ru: 'ru-RU',
}

function formatDisplayValue(value: string, language: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return ''
  const date = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat(localeByLanguage[language] ?? 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * Wraps a native `<input type="date">` with an app-controlled visible label.
 * iOS renders the native date input's displayed value and width using the
 * device locale, ignoring the `lang` attribute, which broke layout and
 * language consistency on iPhone. The native input stays as an invisible,
 * full-size overlay so tapping anywhere still opens the OS date picker.
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, language, placeholder, className }, ref) => {
    const displayValue = formatDisplayValue(value, language)

    return (
      <div
        className={cn(
          'relative flex h-9 w-full min-w-0 items-center rounded-md border border-input bg-background px-3 text-sm',
          className
        )}
      >
        <span
          className={cn('pointer-events-none truncate', !displayValue && 'text-muted-foreground')}
        >
          {displayValue || placeholder}
        </span>
        <input
          ref={ref}
          type="date"
          lang={language}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={placeholder}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    )
  }
)
DateInput.displayName = 'DateInput'
